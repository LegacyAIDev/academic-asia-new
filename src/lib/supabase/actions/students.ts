'use server'

import type { ActionResult } from '@/lib/action-result'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { StudentInsert, StudentUpdate } from '@/types/models'
import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { purgeOwnerStorage } from '@/lib/supabase/actions/record-attachments'
import { getPresentSchoolName } from '@/lib/supabase/queries/present-schools'
import { nextStudentCode } from '@/lib/students/student-code'
import { linkSibling } from '@/lib/supabase/student-siblings'

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
  present_school_id?: number | null
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


/**
 * A current school chosen from the list is stored twice: its id, and its list
 * name in present_school, which the student list, search and exports read. The
 * name always comes from the table, so a posted name can never drift from the
 * id. Without an id the posted text is kept as it is: a student typed in before
 * the list existed keeps that text through unrelated edits. Text sent without
 * any id is not a list school, so it drops an old link rather than sit beside it.
 */
async function withListSchoolName<T extends Partial<CreateStudentInput>>(input: T): Promise<T | null> {
  if (input.present_school_id === undefined) {
    return 'present_school' in input ? { ...input, present_school_id: null } : input
  }
  if (input.present_school_id === null) return input
  const name = await getPresentSchoolName(input.present_school_id)
  return name === null ? null : { ...input, present_school: name }
}

const UNKNOWN_SCHOOL: ActionResult<never> = { success: false, error: 'Choose a school from the list' }
const STALE_STUDENT: ActionResult<never> = {
  success: false,
  conflict: true,
  error: 'Someone saved changes to this student after you opened it, so your changes were not saved. Reload to see the latest details, then make your changes again.',
}

/**
 * Create a new student with auto-generated student code
 */
/** The status a new case starts in: Enquiry, or New where Enquiry is not set up. */
async function startingStatusId(supabase: ReturnType<typeof createClient>): Promise<number> {
  const { data } = await supabase.from('student_statuses').select('id, code').in('code', ['enquiry', 'new'])
  const rows = (data ?? []) as { id: number; code: string }[]
  return (rows.find(r => r.code === 'enquiry') ?? rows.find(r => r.code === 'new'))?.id ?? 1
}

export async function createStudent(
  input: CreateStudentInput,
  options: { sibling?: { id: string; relationship: 'brother' | 'sister' } | null } = {},
): Promise<ActionResult<{ id: string }>> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const newCode = await nextStudentCode(supabase)

    const withSchool = await withListSchoolName(input)
    if (!withSchool) return UNKNOWN_SCHOOL

    const studentData: StudentInsert = {
      ...withSchool,
      student_code: newCode,
      // Every new case starts as an enquiry (New while that status does not exist).
      status_id: input.status_id ?? (await startingStatusId(supabase)),
    }

    const { data, error } = await supabase
      .from('students')
      .insert(studentData)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating student:', error)
      return { success: false, error: error.message }
    }

    const newId = (data as { id: string }).id
    // A brother or sister already in the CRM: linking them shares their parents with the new student.
    if (options.sibling) {
      const linked = await linkSibling(supabase, newId, options.sibling.id, options.sibling.relationship)
      if (linked) return { success: true, data: { id: newId }, error: `Student created, but the sibling link failed: ${linked}` }
    }

    revalidatePath('/students')
    return { success: true, data: { id: newId } }
  } catch (err) {
    console.error('Error in createStudent:', err)
    return { success: false, error: 'Failed to create student' }
  }
}

/**
 * Update a student. An editor passes the updated_at it was opened with: if the
 * student was saved since, nothing is written and the editor is told to reload,
 * so an older form cannot silently undo a newer save (UAT DEV24-002).
 */
export async function updateStudent(
  id: string,
  input: Partial<CreateStudentInput>,
  { expectedUpdatedAt }: { expectedUpdatedAt?: string | null } = {},
): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const withSchool = await withListSchoolName(input)
    if (!withSchool) return UNKNOWN_SCHOOL

    const updateData: StudentUpdate = { ...withSchool }

    let update = supabase
      .from('students')
      .update(updateData)
      .eq('id', id)
    if (expectedUpdatedAt) update = update.eq('updated_at', expectedUpdatedAt)
    const { data, error } = await update.select('id')

    if (error) {
      console.error('Error updating student:', error)
      return { success: false, error: error.message }
    }
    if (expectedUpdatedAt && !data?.length) return STALE_STUDENT

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
