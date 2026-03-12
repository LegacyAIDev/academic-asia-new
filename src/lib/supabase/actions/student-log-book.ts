'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

type ActionResult<T = void> = {
  success: boolean
  data?: T
  error?: string
}

export type CreateLogBookInput = {
  student_id: string
  remarks?: string | null
}

/**
 * Create a new log book entry for a student
 */
export async function createStudentLogBookEntry(
  input: CreateLogBookInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('student_log_book')
      .insert(input as never)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating log book entry:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${input.student_id}`)
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('Error in createStudentLogBookEntry:', err)
    return { success: false, error: 'Failed to create log book entry' }
  }
}

/**
 * Delete a log book entry
 */
export async function deleteStudentLogBookEntry(
  entryId: string,
  studentId: string
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('student_log_book')
      .delete()
      .eq('id', entryId)

    if (error) {
      console.error('Error deleting log book entry:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${studentId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in deleteStudentLogBookEntry:', err)
    return { success: false, error: 'Failed to delete log book entry' }
  }
}
