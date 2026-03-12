'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

type ActionResult<T = void> = {
  success: boolean
  data?: T
  error?: string
}

export type CreateResumeInput = {
  student_id: string
  resume_type_id?: number | null
  exam_school?: string | null
  instrument_id?: number | null
  subject?: string | null
  result?: string | null
  qualification?: string | null
  piece?: string | null
  composer?: string | null
  priority?: number | null
  gov?: string | null
  cat?: string | null
  event_name?: string | null
  remarks?: string | null
}

/**
 * Create a new resume entry for a student
 */
export async function createStudentResume(
  input: CreateResumeInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('student_resume')
      .insert(input as never)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating resume:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${input.student_id}`)
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('Error in createStudentResume:', err)
    return { success: false, error: 'Failed to create resume entry' }
  }
}

/**
 * Update an existing resume entry
 */
export async function updateStudentResume(
  resumeId: string,
  studentId: string,
  input: Partial<Omit<CreateResumeInput, 'student_id'>>
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('student_resume')
      .update(input as never)
      .eq('id', resumeId)

    if (error) {
      console.error('Error updating resume:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${studentId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in updateStudentResume:', err)
    return { success: false, error: 'Failed to update resume entry' }
  }
}

/**
 * Delete a resume entry
 */
export async function deleteStudentResume(
  resumeId: string,
  studentId: string
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('student_resume')
      .delete()
      .eq('id', resumeId)

    if (error) {
      console.error('Error deleting resume:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${studentId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in deleteStudentResume:', err)
    return { success: false, error: 'Failed to delete resume entry' }
  }
}
