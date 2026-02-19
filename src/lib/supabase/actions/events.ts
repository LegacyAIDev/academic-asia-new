'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export type CreateEventInput = {
  event_type_id: number
  name: string
  location?: string | null
  start_date?: string | null
  end_date?: string | null
  start_time?: string | null
  end_time?: string | null
  duration_minutes?: number | null
  remarks?: string | null
  assigned_to?: string | null
}

export type ActionResult<T = void> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Create a new event
 */
export async function createEvent(input: CreateEventInput): Promise<ActionResult<{ id: string }>> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('events')
      .insert({
        event_type_id: input.event_type_id,
        name: input.name,
        location: input.location,
        start_date: input.start_date,
        end_date: input.end_date,
        start_time: input.start_time,
        end_time: input.end_time,
        duration_minutes: input.duration_minutes,
        remarks: input.remarks,
        assigned_to: input.assigned_to,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error creating event:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/events')
    return { success: true, data: { id: data.id } }
  } catch (err) {
    console.error('Error in createEvent:', err)
    return { success: false, error: 'Failed to create event' }
  }
}

/**
 * Update an existing event by ID
 */
export async function updateEvent(id: string, input: Partial<CreateEventInput>): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('events')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('Error updating event:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/events')
    revalidatePath(`/events/[type]/${id}`)
    return { success: true }
  } catch (err) {
    console.error('Error in updateEvent:', err)
    return { success: false, error: 'Failed to update event' }
  }
}

/**
 * Delete an event by ID
 */
export async function deleteEvent(id: string): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // First delete related records (cascading isn't always set up)
    await Promise.all([
      supabase.from('event_schools').delete().eq('event_id', id),
      supabase.from('event_interviewers').delete().eq('event_id', id),
      supabase.from('event_schedules').delete().eq('event_id', id),
      supabase.from('event_exams').delete().eq('event_id', id),
      supabase.from('event_results').delete().eq('event_id', id),
    ])

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting event:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/events')
    return { success: true }
  } catch (err) {
    console.error('Error in deleteEvent:', err)
    return { success: false, error: 'Failed to delete event' }
  }
}

// Event Schools CRUD

export type CreateEventSchoolInput = {
  event_id: string
  school_id: string
  remarks?: string | null
  event_remarks?: string | null
  registration_fee?: string | null
  payable_to?: string | null
  is_confirmed?: boolean
  is_school_confirmed?: boolean
  application_deadline?: string | null
  application_deadline_remarks?: string | null
}

export async function addEventSchool(input: CreateEventSchoolInput): Promise<ActionResult<{ id: string }>> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('event_schools')
      .insert(input)
      .select('id')
      .single()

    if (error) {
      console.error('Error adding event school:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/events`)
    return { success: true, data: { id: data.id } }
  } catch (err) {
    console.error('Error in addEventSchool:', err)
    return { success: false, error: 'Failed to add school to event' }
  }
}

export async function removeEventSchool(eventSchoolId: string, eventId: string): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('event_schools')
      .delete()
      .eq('id', eventSchoolId)

    if (error) {
      console.error('Error removing event school:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/events`)
    return { success: true }
  } catch (err) {
    console.error('Error in removeEventSchool:', err)
    return { success: false, error: 'Failed to remove school from event' }
  }
}

// Event Interviewers CRUD

export type CreateEventInterviewerInput = {
  event_id: string
  school_id: string
  name: string
  remarks?: string | null
}

export async function addEventInterviewer(input: CreateEventInterviewerInput): Promise<ActionResult<{ id: string }>> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('event_interviewers')
      .insert(input)
      .select('id')
      .single()

    if (error) {
      console.error('Error adding event interviewer:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/events`)
    return { success: true, data: { id: data.id } }
  } catch (err) {
    console.error('Error in addEventInterviewer:', err)
    return { success: false, error: 'Failed to add interviewer' }
  }
}

export async function removeEventInterviewer(interviewerId: string, eventId: string): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('event_interviewers')
      .delete()
      .eq('id', interviewerId)

    if (error) {
      console.error('Error removing interviewer:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/events`)
    return { success: true }
  } catch (err) {
    console.error('Error in removeEventInterviewer:', err)
    return { success: false, error: 'Failed to remove interviewer' }
  }
}

// Event Schedules CRUD

export type CreateEventScheduleInput = {
  event_id: string
  student_id: string
  schedule_date?: string | null
  timeslot?: number | null
  interviewer_name?: string | null
  remarks?: string | null
}

export async function addEventSchedule(input: CreateEventScheduleInput): Promise<ActionResult<{ id: string }>> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('event_schedules')
      .insert(input)
      .select('id')
      .single()

    if (error) {
      console.error('Error adding event schedule:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/events`)
    return { success: true, data: { id: data.id } }
  } catch (err) {
    console.error('Error in addEventSchedule:', err)
    return { success: false, error: 'Failed to add schedule' }
  }
}

export async function removeEventSchedule(scheduleId: string, eventId: string): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('event_schedules')
      .delete()
      .eq('id', scheduleId)

    if (error) {
      console.error('Error removing schedule:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/events`)
    return { success: true }
  } catch (err) {
    console.error('Error in removeEventSchedule:', err)
    return { success: false, error: 'Failed to remove schedule' }
  }
}
