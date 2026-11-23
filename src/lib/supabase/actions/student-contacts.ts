'use server'

import type { ActionResult } from '@/lib/action-result'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { missingRequired, type RequiredRule } from '@/lib/forms/required-fields'
import { SIBLING_CODES } from '@/lib/students/shared-parents'
import { ALREADY_LINKED, UNIQUE_VIOLATION, mergeSiblingParents, revalidateFamilyPages, siblingIdsOf, withLinkedStudent } from '@/lib/supabase/student-siblings'

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
      .insert(linked.input)
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
        const { data: rel } = input.relationship_id == null
          ? { data: null }
          : await supabase.from('contact_relationships').select('code').eq('id', input.relationship_id).maybeSingle()
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
    // The type leaves these out, but a crafted call could still send them.
    const { student_id: _owner, created_by: _creator, ...fields } = linked.input as Partial<CreateContactInput> & { created_by?: string | null }

    const { error } = await supabase
      .from('student_contacts')
      .update(fields)
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
