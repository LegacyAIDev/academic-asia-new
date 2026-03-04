'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

type ActionResult<T = void> = {
  success: boolean
  data?: T
  error?: string
}

export type CreateSchoolAcademicResultInput = {
  school_id: string
  exam_year?: number | null
  exam_type_id?: number | null
  grade_range?: string | null
  result_percentage?: number | null
  remarks?: string | null
}

/**
 * Create a new academic result entry for a school
 */
export async function createSchoolAcademicResult(
  input: CreateSchoolAcademicResultInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('school_academic_results')
      .insert(input as never)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating academic result:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/schools/${input.school_id}`)
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('Error in createSchoolAcademicResult:', err)
    return { success: false, error: 'Failed to create academic result' }
  }
}

/**
 * Update an existing academic result
 */
export async function updateSchoolAcademicResult(
  resultId: string,
  schoolId: string,
  input: Partial<Omit<CreateSchoolAcademicResultInput, 'school_id'>>
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('school_academic_results')
      .update(input as never)
      .eq('id', resultId)

    if (error) {
      console.error('Error updating academic result:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/schools/${schoolId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in updateSchoolAcademicResult:', err)
    return { success: false, error: 'Failed to update academic result' }
  }
}

/**
 * Delete an academic result
 */
export async function deleteSchoolAcademicResult(
  resultId: string,
  schoolId: string
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('school_academic_results')
      .delete()
      .eq('id', resultId)

    if (error) {
      console.error('Error deleting academic result:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/schools/${schoolId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in deleteSchoolAcademicResult:', err)
    return { success: false, error: 'Failed to delete academic result' }
  }
}
