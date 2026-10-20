'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { deleteAttachmentsForRecord } from '@/lib/supabase/actions/record-attachments'
import { isUuid } from '@/lib/scheduler/uuid'

type ActionResult<T = void> = {
  success: boolean
  data?: T
  error?: string
}

export type CreateApplicationInput = {
  student_id: string
  school_id: string
  year_group?: number | null
  entry_year?: number | null
  entry_month?: number | null
  course_start_month?: number | null
  course_start_year?: number | null
  status_id?: number | null
  sub_status_id?: number | null
  mode_id?: number | null
  is_referral?: boolean | null
  scholarship_detail?: string | null
  scholarship_types?: string[] | null
  event_id?: string | null
  event_date?: string | null
  event_time?: string | null
  music_audition?: string | null
  result_remarks?: string | null
  remarks_to_school?: string | null
  aa_remarks?: string | null
  registration_date?: string | null
  visit_date?: string | null
  visit_time?: string | null
  school_contact?: string | null
  visit_remarks?: string | null
}

/**
 * Create a new school application for a student
 */
export async function createStudentApplication(
  input: CreateApplicationInput
): Promise<ActionResult<{ id: string }>> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('student_applications')
      .insert(input as never)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating application:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${input.student_id}`)
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('Error in createStudentApplication:', err)
    return { success: false, error: 'Failed to create application' }
  }
}

/**
 * Update an existing school application. Scoped to the student as well as the
 * application id, so a request naming the wrong student changes nothing. The
 * student itself is never changed here: the type leaves it out, but a crafted
 * call could still send it, so it is dropped at runtime too.
 */
export async function updateStudentApplication(
  applicationId: string,
  studentId: string,
  input: Partial<Omit<CreateApplicationInput, 'student_id'>>
): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied
  if (!isUuid(applicationId) || !isUuid(studentId)) return { success: false, error: 'Application not found' }

  const changes: Record<string, unknown> = { ...input }
  delete changes.student_id

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('student_applications')
      .update(changes as never)
      .eq('id', applicationId)
      .eq('student_id', studentId)
      .select('id')

    if (error) {
      console.error('Error updating application:', error)
      return { success: false, error: error.message }
    }
    if (!data?.length) return { success: false, error: 'Application not found' }

    revalidatePath(`/students/${studentId}`)
    revalidatePath(`/students/${studentId}/applications/${applicationId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in updateStudentApplication:', err)
    return { success: false, error: 'Failed to update application' }
  }
}

/**
 * Delete a school application (cascades to deposits)
 */
export async function deleteStudentApplication(
  applicationId: string,
  studentId: string
): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Attachments are polymorphic, so no foreign key cascades them. Remove them
    // first: an orphaned storage object is invisible and never cleaned up.
    await deleteAttachmentsForRecord('student_application', applicationId, studentId)

    const { error } = await supabase
      .from('student_applications')
      .delete()
      .eq('id', applicationId)

    if (error) {
      console.error('Error deleting application:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${studentId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in deleteStudentApplication:', err)
    return { success: false, error: 'Failed to delete application' }
  }
}
