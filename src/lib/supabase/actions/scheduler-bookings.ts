'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { BOOKING_TYPE_LABELS, isExamBooking } from '@/lib/scheduler/config'
import { defaultBookingTitle } from '@/lib/scheduler/booking-title'
import {
  bookingFormSchema,
  cancelReasonSchema,
  moveBookingSchema,
  type BookingFormInput,
  type BookingFormValues,
  type MoveBookingInput,
} from '@/lib/scheduler/booking-schema'
import { bookingRevalidationPaths } from '@/lib/scheduler/booking-revalidation-paths'
import { findConflicts, type ConflictSummary } from '@/lib/scheduler/conflicts'
import { mapSchedulerError } from '@/lib/scheduler/error-messages'
import { getFreeBusy } from '@/lib/supabase/queries/scheduler-availability'
import { getBooking } from '@/lib/supabase/queries/scheduler-bookings'
import { bookingDetailToFormInput } from '@/lib/scheduler/booking-defaults'
import type { Json } from '@/types/database'

export type ActionResult<T = void> = { success: boolean; data?: T; error?: string }

export type SaveBookingResult = ActionResult<{ id?: string; conflicts?: ConflictSummary }>

function revalidateBookingPaths(booking: Parameters<typeof bookingRevalidationPaths>[0]) {
  for (const path of bookingRevalidationPaths(booking)) revalidatePath(path)
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
/** A title from the booking's type, student (or first candidate), school and room, for one left empty. */
async function titleFor(supabase: ReturnType<typeof createClient>, values: BookingFormValues): Promise<string> {
  const studentId = values.student_id ?? values.attendees.find(a => a.student_id)?.student_id ?? null
  const [student, school, room] = await Promise.all([
    studentId ? supabase.from('students').select('first_name, surname').eq('id', studentId).maybeSingle() : null,
    values.school_id ? supabase.from('schools').select('name').eq('id', values.school_id).maybeSingle() : null,
    values.location_type === 'room' && values.room_id ? supabase.from('scheduler_rooms').select('display_name').eq('id', values.room_id).maybeSingle() : null,
  ])
  const s = student?.data as { first_name: string | null; surname: string | null } | null | undefined
  const candidates = values.attendees.filter(a => a.student_id).length
  const who = s ? [s.first_name, s.surname].filter(Boolean).join(' ') + (candidates > 1 ? ` and ${candidates - 1} more` : '') : null
  return defaultBookingTitle(BOOKING_TYPE_LABELS[values.booking_type], [
    who,
    (school?.data as { name: string | null } | null | undefined)?.name,
    values.location_type === 'online' ? 'Online' : (room?.data as { display_name: string | null } | null | undefined)?.display_name,
  ])
}

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
    if (!values.title) values.title = await titleFor(supabase, values)
    const { data, error } = await supabase.rpc('scheduler_save_booking', toRpcPayload(values))
    if (error) return { success: false, error: mapSchedulerError(error) }

    revalidateBookingPaths(values)
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
    revalidateBookingPaths(booking)
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
    if (booking.status === 'confirmed' && isExamBooking(booking.booking_type)) {
      const examDenied = await assertAccess(MODULES.EXAMS, ACCESS.WRITE)
      if (examDenied) return examDenied
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { error } = await supabase.rpc('scheduler_cancel_booking', { p_id: id, p_reason: parsed.data.reason })
    if (error) return { success: false, error: mapSchedulerError(error) }

    revalidateBookingPaths(booking)
    return { success: true }
  } catch (error) {
    console.error('cancelBooking failed:', error)
    return { success: false, error: 'Failed to cancel booking' }
  }
}

/**
 * Records whether a candidate showed up (the exam desk has one row per candidate)
 * or, without a student, every candidate of the booking not yet recorded. A
 * show-up completes the candidate's exam record.
 */
export async function recordAttendance(id: string, attendance: 'show_up' | 'no_show', studentId?: string | null): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.EXAMS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { error } = studentId
      ? await supabase.rpc('scheduler_record_candidate_attendance', { p_id: id, p_student: studentId, p_attendance: attendance })
      : await supabase.rpc('scheduler_record_attendance', { p_id: id, p_attendance: attendance })
    if (error) return { success: false, error: mapSchedulerError(error) }

    const booking = await getBooking(id)
    revalidateBookingPaths(booking)
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
