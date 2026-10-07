'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { EXAM_BOOKING_TYPES } from '@/lib/scheduler/config'
import {
  bookingFormSchema,
  cancelReasonSchema,
  moveBookingSchema,
  type BookingFormInput,
  type BookingFormValues,
  type MoveBookingInput,
} from '@/lib/scheduler/booking-schema'
import { findConflicts, type ConflictSummary } from '@/lib/scheduler/conflicts'
import { mapSchedulerError } from '@/lib/scheduler/error-messages'
import { getFreeBusy } from '@/lib/supabase/queries/scheduler-availability'
import { getBooking } from '@/lib/supabase/queries/scheduler-bookings'
import { bookingDetailToFormInput } from '@/lib/scheduler/booking-defaults'
import type { Json } from '@/types/database'

export type ActionResult<T = void> = { success: boolean; data?: T; error?: string }

export type SaveBookingResult = ActionResult<{ id?: string; conflicts?: ConflictSummary }>

function isExamType(type: string): boolean {
  return (EXAM_BOOKING_TYPES as string[]).includes(type)
}

function revalidateBookingPaths(studentId?: string | null, examId?: string | null) {
  revalidatePath('/scheduler')
  if (studentId) revalidatePath(`/students/${studentId}`)
  if (examId) revalidatePath('/exams')
}

/** Busy people among the attendees, or null when nobody is double-booked. */
async function personConflicts(values: BookingFormValues): Promise<ConflictSummary | null> {
  const profileIds = values.attendees.map(a => a.profile_id).filter((id): id is string => Boolean(id))
  if (values.organiser_id) profileIds.push(values.organiser_id)
  const studentIds = values.attendees.map(a => a.student_id).filter((id): id is string => Boolean(id))
  if (values.student_id) studentIds.push(values.student_id)
  if (profileIds.length === 0 && studentIds.length === 0) return null

  const busy = await getFreeBusy({
    from: values.start_at,
    to: values.end_at,
    profileIds,
    studentIds,
    excludeBookingId: values.id ?? null,
  })
  const conflicts = findConflicts({ startAt: values.start_at, endAt: values.end_at }, busy)
  return conflicts.people.length > 0 ? conflicts : null
}

function toRpcPayload(values: BookingFormValues) {
  const { attendees, override_person_conflicts, ...booking } = values
  void override_person_conflicts
  return {
    p_booking: { ...booking, online_link: booking.online_link || null } as unknown as Json,
    p_attendees: attendees as unknown as Json,
  }
}

/** Creates or updates a booking through the atomic save RPC, warning about busy people first. */
export async function saveBooking(input: BookingFormInput): Promise<SaveBookingResult> {
  const denied = await assertAccess(MODULES.SCHEDULER, ACCESS.WRITE)
  if (denied) return denied

  const parsed = bookingFormSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid booking' }
  const values = parsed.data

  try {
    if (values.id) {
      const existing = await getBooking(values.id)
      if (!existing) return { success: false, error: 'Booking not found.' }
      const moved =
        new Date(existing.start_at).getTime() !== new Date(values.start_at).getTime() ||
        new Date(existing.end_at).getTime() !== new Date(values.end_at).getTime() ||
        existing.room_id !== (values.room_id ?? null)
      if (moved && !values.reason) return { success: false, error: 'Please give a reason for rescheduling.' }
    }

    if (!values.override_person_conflicts) {
      const conflicts = await personConflicts(values)
      if (conflicts) return { success: false, error: 'CONFLICT', data: { conflicts } }
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data, error } = await supabase.rpc('scheduler_save_booking', toRpcPayload(values))
    if (error) return { success: false, error: mapSchedulerError(error) }

    revalidateBookingPaths(values.student_id, values.exam_id)
    return { success: true, data: { id: data } }
  } catch (error) {
    console.error('saveBooking failed:', error)
    return { success: false, error: 'Failed to save booking' }
  }
}

/** Confirms a pending booking; examination officers and managers only. */
export async function confirmBooking(id: string): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.EXAMS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { error } = await supabase.rpc('scheduler_confirm_booking', { p_id: id })
    if (error) return { success: false, error: mapSchedulerError(error) }

    const booking = await getBooking(id)
    revalidateBookingPaths(booking?.student_id, booking?.exam_id)
    return { success: true }
  } catch (error) {
    console.error('confirmBooking failed:', error)
    return { success: false, error: 'Failed to confirm booking' }
  }
}

/** Cancels a booking with a reason; a confirmed exam needs the examination team. */
export async function cancelBooking(id: string, input: { reason: string }): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.SCHEDULER, ACCESS.WRITE)
  if (denied) return denied

  const parsed = cancelReasonSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Reason required' }

  try {
    const booking = await getBooking(id)
    if (!booking) return { success: false, error: 'Booking not found.' }
    if (booking.status === 'confirmed' && isExamType(booking.booking_type)) {
      const examDenied = await assertAccess(MODULES.EXAMS, ACCESS.WRITE)
      if (examDenied) return examDenied
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { error } = await supabase.rpc('scheduler_cancel_booking', { p_id: id, p_reason: parsed.data.reason })
    if (error) return { success: false, error: mapSchedulerError(error) }

    revalidateBookingPaths(booking.student_id, booking.exam_id)
    return { success: true }
  } catch (error) {
    console.error('cancelBooking failed:', error)
    return { success: false, error: 'Failed to cancel booking' }
  }
}

/** Records whether the student or attendees showed up; a show-up completes a linked exam. */
export async function recordAttendance(id: string, attendance: 'show_up' | 'no_show'): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.EXAMS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { error } = await supabase.rpc('scheduler_record_attendance', { p_id: id, p_attendance: attendance })
    if (error) return { success: false, error: mapSchedulerError(error) }

    const booking = await getBooking(id)
    revalidateBookingPaths(booking?.student_id, booking?.exam_id)
    return { success: true }
  } catch (error) {
    console.error('recordAttendance failed:', error)
    return { success: false, error: 'Failed to record attendance' }
  }
}

/** Moves a booking to a new time or room (drag and drop), keeping everything else. */
export async function moveBooking(id: string, input: MoveBookingInput): Promise<SaveBookingResult> {
  const denied = await assertAccess(MODULES.SCHEDULER, ACCESS.WRITE)
  if (denied) return denied

  const parsed = moveBookingSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid move' }

  const booking = await getBooking(id)
  if (!booking) return { success: false, error: 'Booking not found.' }
  if (booking.status === 'cancelled') return { success: false, error: 'Cancelled bookings cannot be moved.' }

  const roomId = parsed.data.room_id === undefined ? booking.room_id : parsed.data.room_id
  return saveBooking({
    ...bookingDetailToFormInput(booking),
    override_person_conflicts: true,
    start_at: parsed.data.start_at,
    end_at: parsed.data.end_at,
    room_id: roomId,
    location_type: roomId ? 'room' : 'online',
    reason: parsed.data.reason,
  })
}
