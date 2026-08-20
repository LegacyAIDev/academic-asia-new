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

export type CreateExamResultInput = {
  student_id: string
  school_id?: string | null
  test_date?: string | null
  exam_type_id?: number | null
  subject_id?: number | null
  paper_id?: number | null
  paper_ready?: boolean | null
  score?: number | null
  max_score?: number | null
  status_id?: number | null
  remarks?: string | null
}

/**
 * Create a new exam result for a student
 */
export async function createStudentExamResult(
  input: CreateExamResultInput
): Promise<ActionResult<{ id: string }>> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('student_exam_results')
      .insert(input as never)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating exam result:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${input.student_id}`)
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('Error in createStudentExamResult:', err)
    return { success: false, error: 'Failed to create exam result' }
  }
}

/**
 * Update an existing exam result
 */
export async function updateStudentExamResult(
  resultId: string,
  studentId: string,
  input: Partial<Omit<CreateExamResultInput, 'student_id'>>
): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('student_exam_results')
      .update(input as never)
      .eq('id', resultId)

    if (error) {
      console.error('Error updating exam result:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${studentId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in updateStudentExamResult:', err)
    return { success: false, error: 'Failed to update exam result' }
  }
}

/**
 * Delete an exam result
 */
export async function deleteStudentExamResult(
  resultId: string,
  studentId: string
): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('student_exam_results')
      .delete()
      .eq('id', resultId)

    if (error) {
      console.error('Error deleting exam result:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${studentId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in deleteStudentExamResult:', err)
    return { success: false, error: 'Failed to delete exam result' }
  }
}
