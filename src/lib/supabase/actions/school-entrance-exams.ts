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

export type CreateSchoolEntranceExamInput = {
  school_id: string
  entry_year?: string | null
  exam_type_id?: number | null
  year_level?: string | null
  subject?: string | null
  duration_minutes?: number | null
  exam_format?: string | null
  has_paper?: boolean | null
  remarks?: string | null
  aa_remarks?: string | null
}

/**
 * Create a new entrance exam entry for a school
 */
export async function createSchoolEntranceExam(
  input: CreateSchoolEntranceExamInput
): Promise<ActionResult<{ id: string }>> {
  const denied = await assertAccess(MODULES.SCHOOLS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('school_entrance_exams')
      .insert(input as never)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating entrance exam:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/schools/${input.school_id}`)
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('Error in createSchoolEntranceExam:', err)
    return { success: false, error: 'Failed to create entrance exam' }
  }
}

/**
 * Update an existing entrance exam
 */
export async function updateSchoolEntranceExam(
  examId: string,
  schoolId: string,
  input: Partial<Omit<CreateSchoolEntranceExamInput, 'school_id'>>
): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.SCHOOLS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('school_entrance_exams')
      .update(input as never)
      .eq('id', examId)

    if (error) {
      console.error('Error updating entrance exam:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/schools/${schoolId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in updateSchoolEntranceExam:', err)
    return { success: false, error: 'Failed to update entrance exam' }
  }
}

/**
 * Delete an entrance exam
 */
export async function deleteSchoolEntranceExam(
  examId: string,
  schoolId: string
): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.SCHOOLS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('school_entrance_exams')
      .delete()
      .eq('id', examId)

    if (error) {
      console.error('Error deleting entrance exam:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/schools/${schoolId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in deleteSchoolEntranceExam:', err)
    return { success: false, error: 'Failed to delete entrance exam' }
  }
}
