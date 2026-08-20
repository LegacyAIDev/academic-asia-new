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

export type CreateEducationInput = {
  student_id: string
  course_id?: number | null
  tutor?: string | null
  start_date?: string | null
  end_date?: string | null
  total_hours?: string | null
  status_id?: number | null
  email_sent?: boolean | null
  remarks?: string | null
}

/**
 * Create a new education entry for a student
 */
export async function createStudentEducation(
  input: CreateEducationInput
): Promise<ActionResult<{ id: string }>> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('student_education')
      .insert(input as never)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating education:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${input.student_id}`)
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('Error in createStudentEducation:', err)
    return { success: false, error: 'Failed to create education entry' }
  }
}

/**
 * Update an existing education entry
 */
export async function updateStudentEducation(
  educationId: string,
  studentId: string,
  input: Partial<Omit<CreateEducationInput, 'student_id'>>
): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('student_education')
      .update(input as never)
      .eq('id', educationId)

    if (error) {
      console.error('Error updating education:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${studentId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in updateStudentEducation:', err)
    return { success: false, error: 'Failed to update education entry' }
  }
}

/**
 * Delete an education entry
 */
export async function deleteStudentEducation(
  educationId: string,
  studentId: string
): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('student_education')
      .delete()
      .eq('id', educationId)

    if (error) {
      console.error('Error deleting education:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${studentId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in deleteStudentEducation:', err)
    return { success: false, error: 'Failed to delete education entry' }
  }
}
