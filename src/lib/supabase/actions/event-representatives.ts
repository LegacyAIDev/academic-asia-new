'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

type ActionResult<T = void> = { success: boolean; data?: T; error?: string }

export type CreateRepresentativeInput = {
  event_id: string
  school_id?: string | null
  school_contact_id?: string | null
  name: string
  role?: string | null
  venue_room?: string | null
  available_from?: string | null
  available_to?: string | null
  slot_length_minutes?: number | null
  remarks?: string | null
}

/** Add a representative to an event */
export async function addRepresentative(
  input: CreateRepresentativeInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data, error } = await supabase
      .from('event_representatives')
      .insert(input)
      .select('id')
      .single()
    if (error) {
      console.error('Error adding representative:', error)
      return { success: false, error: error.message }
    }
    revalidatePath('/events')
    return { success: true, data: { id: data.id } }
  } catch (err) {
    console.error('Error in addRepresentative:', err)
    return { success: false, error: 'Failed to add representative' }
  }
}

/** Update an existing representative */
export async function updateRepresentative(
  id: string,
  input: Partial<Omit<CreateRepresentativeInput, 'event_id'>>
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { error } = await supabase
      .from('event_representatives')
      .update(input)
      .eq('id', id)
    if (error) {
      console.error('Error updating representative:', error)
      return { success: false, error: error.message }
    }
    revalidatePath('/events')
    return { success: true }
  } catch (err) {
    console.error('Error in updateRepresentative:', err)
    return { success: false, error: 'Failed to update representative' }
  }
}

/** Remove a representative from an event */
export async function removeRepresentative(id: string): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { error } = await supabase
      .from('event_representatives')
      .delete()
      .eq('id', id)
    if (error) {
      console.error('Error removing representative:', error)
      return { success: false, error: error.message }
    }
    revalidatePath('/events')
    return { success: true }
  } catch (err) {
    console.error('Error in removeRepresentative:', err)
    return { success: false, error: 'Failed to remove representative' }
  }
}

/** Fetch representatives for an event */
export async function getEventRepresentativesList(eventId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('event_representatives')
    .select(`*, school:schools!event_interviewers_school_id_fkey(id, name)`)
    .eq('event_id', eventId)
    .order('created_at')
  if (error) {
    console.error('Error fetching representatives:', error)
    return []
  }
  return data ?? []
}
