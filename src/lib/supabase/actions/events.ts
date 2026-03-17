'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export type CreateEventInput = {
  event_type_id: number
  name: string
  category_id?: number | null
  parent_event_id?: string | null
  delivery_mode_id?: number | null
  visibility_id?: number | null
  scheduling_mode_id?: number | null
  school_id?: string | null
  location?: string | null
  online_link?: string | null
  capacity?: number | null
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
        category_id: input.category_id,
        parent_event_id: input.parent_event_id,
        delivery_mode_id: input.delivery_mode_id,
        visibility_id: input.visibility_id,
        scheduling_mode_id: input.scheduling_mode_id,
        school_id: input.school_id,
        location: input.location,
        online_link: input.online_link,
        capacity: input.capacity,
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
      supabase.from('event_representatives').delete().eq('event_id', id),
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

// Event Representatives CRUD

export type CreateEventRepresentativeInput = {
  event_id: string
  school_id: string
  name: string
  remarks?: string | null
}

export async function addEventRepresentative(input: CreateEventRepresentativeInput): Promise<ActionResult<{ id: string }>> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('event_representatives')
      .insert(input)
      .select('id')
      .single()

    if (error) {
      console.error('Error adding event representative:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/events`)
    return { success: true, data: { id: data.id } }
  } catch (err) {
    console.error('Error in addEventRepresentative:', err)
    return { success: false, error: 'Failed to add representative' }
  }
}

export async function removeEventRepresentative(representativeId: string, eventId: string): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('event_representatives')
      .delete()
      .eq('id', representativeId)

    if (error) {
      console.error('Error removing representative:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/events`)
    return { success: true }
  } catch (err) {
    console.error('Error in removeEventRepresentative:', err)
    return { success: false, error: 'Failed to remove representative' }
  }
}

// Event Schedules CRUD

export type CreateEventScheduleInput = {
  event_id: string
  student_id: string
  schedule_date?: string | null
  timeslot?: number | null
  representative_name?: string | null
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
