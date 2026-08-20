'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'

type ActionResult<T = void> = {
  success: boolean
  data?: T
  error?: string
}

const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function validateSlotInput(date: string, start: string, end: string): string | null {
  if (!DATE_RE.test(date)) return 'Invalid date format'
  if (!TIME_RE.test(start) || !TIME_RE.test(end)) return 'Invalid time format'
  return null
}

export type AssignSlotInput = {
  event_id: string
  student_id: string
  representative_id: string
  schedule_date: string
  start_time: string
  end_time: string
  remarks?: string | null
}

export type MoveSlotInput = {
  representative_id: string
  schedule_date: string
  start_time: string
  end_time: string
}

/** Check if a representative has an overlapping booking at the given time */
async function hasRepOverlap(
  supabase: ReturnType<typeof createClient>,
  eventId: string,
  repId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeScheduleId?: string
): Promise<boolean> {
  let query = supabase
    .from('event_schedules')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('representative_id', repId)
    .eq('schedule_date', date)
    .lt('start_time', endTime)
    .gt('end_time', startTime)

  if (excludeScheduleId) {
    query = query.neq('id', excludeScheduleId)
  }

  const { count } = await query
  return (count ?? 0) > 0
}

/** Check if a student already has an overlapping schedule in the same event */
async function hasStudentOverlap(
  supabase: ReturnType<typeof createClient>,
  eventId: string,
  studentId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeScheduleId?: string
): Promise<boolean> {
  let query = supabase
    .from('event_schedules')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('student_id', studentId)
    .eq('schedule_date', date)
    .lt('start_time', endTime)
    .gt('end_time', startTime)

  if (excludeScheduleId) {
    query = query.neq('id', excludeScheduleId)
  }

  const { count } = await query
  return (count ?? 0) > 0
}

/** Assign a student to a time slot */
export async function assignStudentToSlot(input: AssignSlotInput): Promise<ActionResult<{ id: string }>> {
  const denied = await assertAccess(MODULES.EVENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const validationError = validateSlotInput(input.schedule_date, input.start_time, input.end_time)
    if (validationError) return { success: false, error: validationError }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Validate no double-booking for the representative
    const repConflict = await hasRepOverlap(
      supabase, input.event_id, input.representative_id,
      input.schedule_date, input.start_time, input.end_time
    )
    if (repConflict) {
      return { success: false, error: 'This time slot is already booked for this representative.' }
    }

    // Validate student isn't double-booked at the same time
    const studentConflict = await hasStudentOverlap(
      supabase, input.event_id, input.student_id,
      input.schedule_date, input.start_time, input.end_time
    )
    if (studentConflict) {
      return { success: false, error: 'This student already has a session at this time.' }
    }

    const { data, error } = await supabase
      .from('event_schedules')
      .insert({
        event_id: input.event_id,
        student_id: input.student_id,
        representative_id: input.representative_id,
        schedule_date: input.schedule_date,
        start_time: input.start_time,
        end_time: input.end_time,
        remarks: input.remarks ?? null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error assigning student to slot:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/events')
    return { success: true, data: { id: data.id } }
  } catch (err) {
    console.error('Error in assignStudentToSlot:', err)
    return { success: false, error: 'Failed to assign student to slot' }
  }
}

/** Block a time slot (lunch, break, etc.) */
export async function createBlocker(input: {
  event_id: string
  representative_id: string
  schedule_date: string
  start_time: string
  end_time: string
  remarks?: string | null
}): Promise<ActionResult<{ id: string }>> {
  const denied = await assertAccess(MODULES.EVENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const validationError = validateSlotInput(input.schedule_date, input.start_time, input.end_time)
    if (validationError) return { success: false, error: validationError }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const repConflict = await hasRepOverlap(
      supabase, input.event_id, input.representative_id,
      input.schedule_date, input.start_time, input.end_time
    )
    if (repConflict) {
      return { success: false, error: 'This time slot is already occupied.' }
    }

    const { data, error } = await supabase
      .from('event_schedules')
      .insert({
        event_id: input.event_id,
        representative_id: input.representative_id,
        schedule_date: input.schedule_date,
        start_time: input.start_time,
        end_time: input.end_time,
        remarks: input.remarks ?? 'Blocked',
        is_blocker: true,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error creating blocker:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/events')
    return { success: true, data: { id: data.id } }
  } catch (err) {
    console.error('Error in createBlocker:', err)
    return { success: false, error: 'Failed to create blocker' }
  }
}

/** Remove a schedule entry (student assignment or blocker) */
export async function removeStudentFromSlot(scheduleId: string, eventId: string): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.EVENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('event_schedules')
      .delete()
      .eq('id', scheduleId)
      .eq('event_id', eventId)

    if (error) {
      console.error('Error removing student from slot:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/events')
    return { success: true }
  } catch (err) {
    console.error('Error in removeStudentFromSlot:', err)
    return { success: false, error: 'Failed to remove student from slot' }
  }
}

/** Move a student to a different time slot or representative */
export async function moveStudentSlot(scheduleId: string, eventId: string, input: MoveSlotInput): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.EVENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const validationError = validateSlotInput(input.schedule_date, input.start_time, input.end_time)
    if (validationError) return { success: false, error: validationError }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: current, error: fetchError } = await supabase
      .from('event_schedules')
      .select('student_id')
      .eq('id', scheduleId)
      .single()

    if (fetchError || !current) {
      return { success: false, error: 'Schedule entry not found.' }
    }

    // Validate no rep overlap (exclude current entry)
    const repConflict = await hasRepOverlap(
      supabase, eventId, input.representative_id,
      input.schedule_date, input.start_time, input.end_time, scheduleId
    )
    if (repConflict) {
      return { success: false, error: 'This time slot is already booked for this representative.' }
    }

    // Validate no student overlap (exclude current entry)
    const studentConflict = await hasStudentOverlap(
      supabase, eventId, current.student_id,
      input.schedule_date, input.start_time, input.end_time, scheduleId
    )
    if (studentConflict) {
      return { success: false, error: 'This student already has a session at this time.' }
    }

    const { error } = await supabase
      .from('event_schedules')
      .update({
        representative_id: input.representative_id,
        schedule_date: input.schedule_date,
        start_time: input.start_time,
        end_time: input.end_time,
      })
      .eq('id', scheduleId)

    if (error) {
      console.error('Error moving student slot:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/events')
    return { success: true }
  } catch (err) {
    console.error('Error in moveStudentSlot:', err)
    return { success: false, error: 'Failed to move student slot' }
  }
}
