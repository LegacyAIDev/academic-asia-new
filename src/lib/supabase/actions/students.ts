'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { StudentInsert, StudentUpdate } from '@/types/database.types'
import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { purgeOwnerStorage } from '@/lib/supabase/actions/record-attachments'

export type CreateStudentInput = {
  surname: string
  first_name: string
  chinese_name?: string | null
  gender?: string | null
  date_of_birth?: string | null
  nationality_id?: number | null
  passport_type?: string | null
  passport_number?: string | null
  email?: string | null
  mobile?: string | null
  telephone?: string | null
  address_line_1?: string | null
  chinese_address?: string | null
  present_school?: string | null
  present_school_type_id?: number | null
  course_id?: number | null
  entry_year?: number | null
  entry_month?: number | null
  enrollment_date?: string | null
  lead_source_category?: string | null
  lead_source_referral_detail?: string | null
  lead_source_event_id?: string | null
  status_id?: number | null
  placement_id?: number | null
  exam_paper?: string | null
  remarks?: string | null
  aa_news?: boolean | null
  airport_pickup?: boolean | null
  assigned_to?: string | null
}

export type ActionResult<T = void> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Create a new student with auto-generated student code
 */
export async function createStudent(input: CreateStudentInput): Promise<ActionResult<{ id: string }>> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Generate student code (get max and increment)
    const { data: codes } = await supabase
      .from('students')
      .select('student_code')
      .like('student_code', 'S%')
      .order('student_code', { ascending: false })
      .limit(1)

    let newCode = 'S000001'
    const latestCode = (codes as { student_code: string | null }[] | null)?.[0]?.student_code
    if (latestCode) {
      const num = parseInt(latestCode.replace('S', ''), 10)
      newCode = `S${String(num + 1).padStart(6, '0')}`
    }

    const studentData: StudentInsert = {
      ...input,
      student_code: newCode,
      status_id: input.status_id ?? 1, // Default to 'new' status
    }

    const { data, error } = await supabase
      .from('students')
      .insert(studentData as never)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating student:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/students')
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('Error in createStudent:', err)
    return { success: false, error: 'Failed to create student' }
  }
}

/**
 * Update an existing student by ID
 */
export async function updateStudent(id: string, input: Partial<CreateStudentInput>): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const updateData: StudentUpdate = { ...input }

    const { error } = await supabase
      .from('students')
      .update(updateData as never)
      .eq('id', id)

    if (error) {
      console.error('Error updating student:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/students')
    revalidatePath(`/students/${id}`)
    return { success: true }
  } catch (err) {
    console.error('Error in updateStudent:', err)
    return { success: false, error: 'Failed to update student' }
  }
}

/**
 * Delete a student and their associated contacts
 */
export async function deleteStudent(id: string): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // First delete related contacts
    await supabase
      .from('student_contacts')
      .delete()
      .eq('student_id', id)

    // Storage is outside Postgres, so the row cascade does not reach the files.
    // Sweep them before the student goes, while the id is still resolvable.
    await purgeOwnerStorage('student', id)

    // Then delete the student
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting student:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/students')
    return { success: true }
  } catch (err) {
    console.error('Error in deleteStudent:', err)
    return { success: false, error: 'Failed to delete student' }
  }
}

// ============================================================================
// Student Contact Actions
// ============================================================================

export type CreateContactInput = {
  student_id: string
  relationship_id?: number | null
  title_id?: number | null
  surname?: string | null
  first_name?: string | null
  gender?: string | null
  telephone?: string | null
  mobile?: string | null
  fax?: string | null
  email_1?: string | null
  email_2?: string | null
  email_3?: string | null
  address_1?: string | null
  address_2?: string | null
  occupation?: string | null
  office_telephone?: string | null
  office_fax?: string | null
  priority?: number | null
  status?: string | null
  remarks?: string | null
}

/**
 * Create a new contact for a student
 */
export async function createStudentContact(input: CreateContactInput): Promise<ActionResult<{ id: string }>> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('student_contacts')
      .insert(input as never)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating contact:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${input.student_id}`)
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('Error in createStudentContact:', err)
    return { success: false, error: 'Failed to create contact' }
  }
}

/**
 * Update an existing contact
 */
export async function updateStudentContact(
  contactId: string,
  studentId: string,
  input: Partial<Omit<CreateContactInput, 'student_id'>>
): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('student_contacts')
      .update(input as never)
      .eq('id', contactId)

    if (error) {
      console.error('Error updating contact:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${studentId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in updateStudentContact:', err)
    return { success: false, error: 'Failed to update contact' }
  }
}

/**
 * Delete a contact
 */
export async function deleteStudentContact(contactId: string, studentId: string): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('student_contacts')
      .delete()
      .eq('id', contactId)

    if (error) {
      console.error('Error deleting contact:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${studentId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in deleteStudentContact:', err)
    return { success: false, error: 'Failed to delete contact' }
  }
}
