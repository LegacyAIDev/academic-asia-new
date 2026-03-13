'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

type ActionResult<T = void> = {
  success: boolean
  data?: T
  error?: string
}

export type CreateSchoolNoteInput = {
  school_id: string
  category_id?: number | null
  detail?: string | null
}

/**
 * Create a new note for a school
 */
export async function createSchoolNote(
  input: CreateSchoolNoteInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('school_notes')
      .insert(input as never)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating school note:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/schools/${input.school_id}`)
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('Error in createSchoolNote:', err)
    return { success: false, error: 'Failed to create school note' }
  }
}

/**
 * Update an existing school note
 */
export async function updateSchoolNote(
  noteId: string,
  schoolId: string,
  input: Partial<Omit<CreateSchoolNoteInput, 'school_id'>>
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('school_notes')
      .update(input as never)
      .eq('id', noteId)

    if (error) {
      console.error('Error updating school note:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/schools/${schoolId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in updateSchoolNote:', err)
    return { success: false, error: 'Failed to update school note' }
  }
}

/**
 * Delete a school note
 */
export async function deleteSchoolNote(
  noteId: string,
  schoolId: string
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('school_notes')
      .delete()
      .eq('id', noteId)

    if (error) {
      console.error('Error deleting school note:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/schools/${schoolId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in deleteSchoolNote:', err)
    return { success: false, error: 'Failed to delete school note' }
  }
}
