'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

type ActionResult<T = void> = { success: boolean; data?: T; error?: string }

export type CreateExamBlockInput = {
  event_id: string
  subject?: string | null
  name?: string | null
  apply_year?: string | null
  duration_minutes?: number | null
  start_time?: string | null
  end_time?: string | null
  venue_room?: string | null
  invigilator_names?: string | null
  capacity?: number | null
  allowed_items?: string | null
  special_instructions?: string | null
  attachment_path?: string | null
  sort_order?: number
}

/** Add an exam block to an event */
export async function addExamBlock(
  input: CreateExamBlockInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data, error } = await supabase
      .from('event_exam_blocks')
      .insert(input)
      .select('id')
      .single()
    if (error) {
      console.error('Error adding exam block:', error)
      return { success: false, error: error.message }
    }
    revalidatePath('/events')
    return { success: true, data: { id: data.id } }
  } catch (err) {
    console.error('Error in addExamBlock:', err)
    return { success: false, error: 'Failed to add exam block' }
  }
}

/** Update an existing exam block */
export async function updateExamBlock(
  id: string,
  input: Partial<Omit<CreateExamBlockInput, 'event_id'>>
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { error } = await supabase
      .from('event_exam_blocks')
      .update(input)
      .eq('id', id)
    if (error) {
      console.error('Error updating exam block:', error)
      return { success: false, error: error.message }
    }
    revalidatePath('/events')
    return { success: true }
  } catch (err) {
    console.error('Error in updateExamBlock:', err)
    return { success: false, error: 'Failed to update exam block' }
  }
}

/** Remove an exam block from an event */
export async function removeExamBlock(id: string): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { error } = await supabase
      .from('event_exam_blocks')
      .delete()
      .eq('id', id)
    if (error) {
      console.error('Error removing exam block:', error)
      return { success: false, error: error.message }
    }
    revalidatePath('/events')
    return { success: true }
  } catch (err) {
    console.error('Error in removeExamBlock:', err)
    return { success: false, error: 'Failed to remove exam block' }
  }
}

/** Fetch exam blocks for an event */
export async function getEventExamBlocks(eventId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('event_exam_blocks')
    .select('*')
    .eq('event_id', eventId)
    .order('sort_order')
  if (error) {
    console.error('Error fetching exam blocks:', error)
    return []
  }
  return data ?? []
}
