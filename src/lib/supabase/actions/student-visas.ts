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

export type CreateVisaInput = {
  student_id: string
  school_id?: string | null
  application?: string | null
  entry_year?: string | null
  entry_month?: number | null
  entry_year_value?: number | null
  status_id?: number | null
  request_sent_to_parent?: boolean | null
  passport_received?: boolean | null
  passport_sent_to_school?: boolean | null
  sent_visa_information?: boolean | null
  cas_received?: boolean | null
  visa_granted?: boolean | null
  visa_copy?: boolean | null
  visa_copy_sent?: boolean | null
  appointment?: boolean | null
  appointment_date?: string | null
  remarks?: string | null
}

/**
 * Create a new visa entry for a student
 */
export async function createStudentVisa(
  input: CreateVisaInput
): Promise<ActionResult<{ id: string }>> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('student_visas')
      .insert(input as never)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating visa:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${input.student_id}`)
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('Error in createStudentVisa:', err)
    return { success: false, error: 'Failed to create visa entry' }
  }
}

/**
 * Update an existing visa entry
 */
export async function updateStudentVisa(
  visaId: string,
  studentId: string,
  input: Partial<Omit<CreateVisaInput, 'student_id'>>
): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('student_visas')
      .update(input as never)
      .eq('id', visaId)

    if (error) {
      console.error('Error updating visa:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${studentId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in updateStudentVisa:', err)
    return { success: false, error: 'Failed to update visa entry' }
  }
}

/**
 * Delete a visa entry
 */
export async function deleteStudentVisa(
  visaId: string,
  studentId: string
): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('student_visas')
      .delete()
      .eq('id', visaId)

    if (error) {
      console.error('Error deleting visa:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${studentId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in deleteStudentVisa:', err)
    return { success: false, error: 'Failed to delete visa entry' }
  }
}
