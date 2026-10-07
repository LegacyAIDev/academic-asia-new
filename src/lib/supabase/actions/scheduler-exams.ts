'use server'

import { canAccess, assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { getCurrentUser } from '@/lib/supabase/auth'
import type { BookingFormInput } from '@/lib/scheduler/booking-schema'
import { bookingDetailPeopleLabels, bookingDetailToFormInput } from '@/lib/scheduler/booking-defaults'
import { bookingInitialFromExam } from '@/lib/scheduler/exam-booking-defaults'
import { todayInBusinessTz } from '@/lib/scheduler/search-params'
import { getBooking } from '@/lib/supabase/queries/scheduler-bookings'
import { getExamBookingLinks, getExamForBooking } from '@/lib/supabase/queries/scheduler-exams'
import { listActiveStaff, type SchedulerStaffOption } from '@/lib/supabase/queries/scheduler-people'
import { getRooms, type SchedulerRoom } from '@/lib/supabase/queries/scheduler-rooms'

export type ActionResult<T = void> = { success: boolean; data?: T; error?: string }

export type BookingDialogContext = {
  rooms: SchedulerRoom[]
  staff: SchedulerStaffOption[]
  currentProfileId: string
  canWrite: boolean
  canConfirm: boolean
  initial: Partial<BookingFormInput>
  peopleLabels: Record<string, string>
}

/**
 * Everything the booking dialog needs when opened away from the calendar page.
 * With an exam id the dialog edits that exam's active booking or pre-fills a new one.
 */
export async function getBookingDialogContextAction(input: {
  examId?: string
  initial?: Partial<BookingFormInput>
}): Promise<ActionResult<BookingDialogContext>> {
  const denied = await assertAccess(MODULES.SCHEDULER, ACCESS.READ)
  if (denied) return denied

  try {
    const [rooms, staff, user, canWrite, canConfirm] = await Promise.all([
      getRooms({ includeInactive: false }),
      listActiveStaff(),
      getCurrentUser(),
      canAccess(MODULES.SCHEDULER, ACCESS.WRITE),
      canAccess(MODULES.EXAMS, ACCESS.WRITE),
    ])

    let initial: Partial<BookingFormInput> = input.initial ?? {}
    let peopleLabels: Record<string, string> = {}

    if (input.examId) {
      const links = await getExamBookingLinks([input.examId])
      const link = links[input.examId]
      const booking = link ? await getBooking(link.booking_id) : null
      if (booking) {
        initial = bookingDetailToFormInput(booking)
        peopleLabels = bookingDetailPeopleLabels(booking)
      } else {
        const exam = await getExamForBooking(input.examId)
        if (!exam) return { success: false, error: 'Exam not found.' }
        initial = bookingInitialFromExam(exam, todayInBusinessTz())
        const name = `${exam.student?.first_name ?? ''} ${exam.student?.surname ?? ''}`.trim()
        if (name) peopleLabels[exam.student_id] = name
      }
    }

    return {
      success: true,
      data: { rooms, staff, currentProfileId: user?.id ?? '', canWrite, canConfirm, initial, peopleLabels },
    }
  } catch (error) {
    console.error('getBookingDialogContextAction failed:', error)
    return { success: false, error: 'Failed to open the booking dialog' }
  }
}
