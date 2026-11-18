'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { StudentInsert, StudentUpdate } from '@/types/database.types'
import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { purgeOwnerStorage } from '@/lib/supabase/actions/record-attachments'
import { getPresentSchoolName } from '@/lib/supabase/queries/present-schools'
import { getLinkedStudent } from '@/lib/supabase/queries/student-family'
import { missingRequired, type RequiredRule } from '@/lib/forms/required-fields'
import { PARENT_CODES, SIBLING_CODES, fillBlanks, parentMerges } from '@/lib/students/shared-parents'
import { nextStudentCode } from '@/lib/students/student-code'

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

export type ActionResult<T = void> = {
  success: boolean
  data?: T
  error?: string
  /** The record changed after the editor opened, so nothing was saved. */
  conflict?: boolean
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

    const newCode = await nextStudentCode(supabase as never)

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
      .insert(studentData as never)
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
      .update(updateData as never)
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
  related_student_id?: string | null
}

/** What an entry needs before it is worth saving. */
const CONTACT_REQUIRED: RequiredRule<CreateContactInput>[] = [
  { anyOf: ['relationship_id'], message: 'Choose the relationship' },
  { anyOf: ['first_name', 'surname', 'telephone', 'mobile', 'email_1', 'related_student_id'], message: 'Enter a name, phone or email, or link an existing student' },
]

/**
 * A family member who is a student too is linked rather than typed: their name
 * and gender are copied from that student, so the row still reads right if the
 * student is ever deleted, while the family tab shows the student's live details.
 * Input without the field leaves an existing link alone.
 */
async function withLinkedStudent<T extends Partial<CreateContactInput>>(
  input: T,
  studentId: string
): Promise<{ input: T } | { error: string }> {
  if (input.related_student_id === undefined) return { input }
  const relatedId = input.related_student_id || null
  if (!relatedId) return { input: { ...input, related_student_id: null } }
  if (relatedId === studentId) return { error: 'A student cannot be their own family member' }

  const linked = await getLinkedStudent(relatedId)
  if (!linked) return { error: 'That student no longer exists. Choose another one.' }
  return {
    input: { ...input, related_student_id: relatedId, surname: linked.surname, first_name: linked.first_name, gender: linked.gender },
  }
}

const UNIQUE_VIOLATION = '23505'
const ALREADY_LINKED = 'This student is already linked as a family member'

/** The student's own page and every linked student's page, which shows the link from the other side. */
function revalidateFamilyPages(studentId: string, linkedIds: (string | null | undefined)[]) {
  revalidatePath(`/students/${studentId}`)
  for (const id of new Set(linkedIds.filter(Boolean))) revalidatePath(`/students/${id}`)
}

type SupabaseServer = ReturnType<typeof createClient>

/** The contact fields a merged parent keeps: anything the kept record lacks is taken from the other. */
const PARENT_FIELDS = [
  'title_id', 'surname', 'first_name', 'gender', 'telephone', 'mobile', 'fax', 'email_1', 'email_2', 'email_3',
  'address_1', 'address_2', 'occupation', 'office_telephone', 'office_fax', 'priority', 'remarks',
] as const

type ParentRow = Record<(typeof PARENT_FIELDS)[number], unknown> & {
  id: string; student_id: string; created_at: string | null
  first_name: string | null; surname: string | null; mobile: string | null; telephone: string | null; email_1: string | null
  relationship: { code: string } | null
}

/** The students linked to this one as brother or sister, whichever side made the link. */
async function siblingIdsOf(supabase: SupabaseServer, studentId: string): Promise<string[]> {
  // Only used to refresh pages, so a failure here never fails the save that asked.
  try {
    return await readSiblingIds(supabase, studentId)
  } catch (err) {
    console.error('Could not read the siblings to refresh:', err)
    return []
  }
}

async function readSiblingIds(supabase: SupabaseServer, studentId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('student_contacts')
    .select('student_id, related_student_id, relationship:contact_relationships!student_contacts_relationship_id_fkey(code)')
    .or(`student_id.eq.${studentId},related_student_id.eq.${studentId}`)
    .not('related_student_id', 'is', null)
  if (error) return []
  const rows = (data ?? []) as unknown as { student_id: string; related_student_id: string; relationship: { code: string } | null }[]
  const ids = rows
    .filter(row => row.relationship && SIBLING_CODES.has(row.relationship.code))
    .map(row => (row.student_id === studentId ? row.related_student_id : row.student_id))
  return [...new Set(ids)]
}

/**
 * Two linked siblings who each hold the same parent end up with one record: the
 * older one is kept, takes any detail only the other had, and the other goes.
 * Different people in the same role (a parent and a step-parent) stay as they are.
 */
async function mergeSiblingParents(supabase: SupabaseServer, firstId: string, secondId: string): Promise<void> {
  const { data, error } = await supabase
    .from('student_contacts')
    .select(`id, student_id, created_at, ${PARENT_FIELDS.join(', ')}, relationship:contact_relationships!student_contacts_relationship_id_fkey(code)`)
    .in('student_id', [firstId, secondId])
    .is('related_student_id', null)
  if (error) { console.error('Could not read parents to merge:', error.message); return }
  const parents = ((data ?? []) as unknown as ParentRow[]).filter(row => row.relationship && PARENT_CODES.has(row.relationship.code))
  const merges = parentMerges(parents.filter(p => p.student_id === firstId), parents.filter(p => p.student_id === secondId))
  for (const { keep, drop } of merges) {
    const patch = fillBlanks(keep, drop, [...PARENT_FIELDS])
    if (Object.keys(patch).length > 0) {
      const { error: updateError } = await supabase.from('student_contacts').update(patch as never).eq('id', keep.id)
      if (updateError) { console.error('Could not merge parent details:', updateError.message); continue }
    }
    const { error: deleteError } = await supabase.from('student_contacts').delete().eq('id', drop.id)
    if (deleteError) console.error('Could not remove the duplicate parent:', deleteError.message)
  }
}

/** Links a new student to an existing brother or sister; returns an error message, or null. */
async function linkSibling(supabase: SupabaseServer, studentId: string, siblingId: string, relationship: 'brother' | 'sister'): Promise<string | null> {
  const { data: rel } = await supabase.from('contact_relationships').select('id').eq('code', relationship).maybeSingle()
  if (!rel) return 'the brother/sister relationship is missing'
  const linked = await withLinkedStudent({ related_student_id: siblingId }, studentId)
  if ('error' in linked) return linked.error
  const { error } = await supabase.from('student_contacts').insert({
    student_id: studentId, relationship_id: (rel as { id: number }).id, ...linked.input,
  } as never)
  if (error) return error.code === UNIQUE_VIOLATION ? ALREADY_LINKED : error.message
  await mergeSiblingParents(supabase, studentId, siblingId)
  revalidateFamilyPages(studentId, [siblingId, ...(await siblingIdsOf(supabase, siblingId))])
  return null
}

/**
 * Create a new contact for a student
 */
export async function createStudentContact(input: CreateContactInput): Promise<ActionResult<{ id: string }>> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied
  const missing = missingRequired(input, CONTACT_REQUIRED)
  if (missing) return { success: false, error: missing }

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const linked = await withLinkedStudent(input, input.student_id)
    if ('error' in linked) return { success: false, error: linked.error }

    const { data, error } = await supabase
      .from('student_contacts')
      .insert(linked.input as never)
      .select('id')
      .single()

    if (error) {
      if (error.code === UNIQUE_VIOLATION) return { success: false, error: ALREADY_LINKED }
      console.error('Error creating contact:', error)
      return { success: false, error: error.message }
    }

    const relatedId = linked.input.related_student_id
    if (relatedId) {
      // Brothers and sisters share their parents: the same parent held on both is merged into one record.
      // The link is already saved; a failed merge is logged and leaves both records showing.
      try {
        const { data: rel } = await supabase.from('contact_relationships').select('code').eq('id', input.relationship_id).maybeSingle()
        if (rel && SIBLING_CODES.has((rel as { code: string }).code)) await mergeSiblingParents(supabase, input.student_id, relatedId)
      } catch (err) {
        console.error('Could not merge the siblings\' parents:', err)
      }
    }
    revalidateFamilyPages(input.student_id, [relatedId, ...(relatedId ? await siblingIdsOf(supabase, relatedId) : [])])
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

    // The contact has to belong to the student whose page this is; its current link
    // is read too, so the previously linked student's page drops it after a change.
    const { data: current, error: readError } = await supabase
      .from('student_contacts')
      .select('related_student_id')
      .eq('id', contactId)
      .eq('student_id', studentId)
      .maybeSingle()
    if (readError) return { success: false, error: readError.message }
    if (!current) return { success: false, error: 'Contact not found' }

    const linked = await withLinkedStudent(input, studentId)
    if ('error' in linked) return { success: false, error: linked.error }

    // Contact details only: which student owns the row and who created it never change here.
    const fields: Record<string, unknown> = { ...linked.input }
    delete fields.student_id
    delete fields.created_by

    const { error } = await supabase
      .from('student_contacts')
      .update(fields as never)
      .eq('id', contactId)
      .eq('student_id', studentId)

    if (error) {
      if (error.code === UNIQUE_VIOLATION) return { success: false, error: ALREADY_LINKED }
      console.error('Error updating contact:', error)
      return { success: false, error: error.message }
    }

    revalidateFamilyPages(studentId, [current.related_student_id, linked.input.related_student_id, ...(await siblingIdsOf(supabase, studentId))])
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

    const { data, error } = await supabase
      .from('student_contacts')
      .delete()
      .eq('id', contactId)
      .eq('student_id', studentId)
      .select('related_student_id')

    if (error) {
      console.error('Error deleting contact:', error)
      return { success: false, error: error.message }
    }

    revalidateFamilyPages(studentId, [...(data ?? []).map((row) => row.related_student_id), ...(await siblingIdsOf(supabase, studentId))])
    return { success: true }
  } catch (err) {
    console.error('Error in deleteStudentContact:', err)
    return { success: false, error: 'Failed to delete contact' }
  }
}
