import { revalidatePath } from 'next/cache'
import type { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'
import { PARENT_CODES, SIBLING_CODES, fillBlanks, parentMerges } from '@/lib/students/shared-parents'
import { getLinkedStudent } from '@/lib/supabase/queries/student-family'
import type { CreateContactInput } from '@/lib/supabase/actions/student-contacts'

/*
 * Brothers and sisters: who is linked to whom, linking a new one, and merging
 * the parents they share. Server-side helpers for the student and contact
 * actions; not actions themselves, so they live outside a 'use server' file.
 */

export const UNIQUE_VIOLATION = '23505'
export const ALREADY_LINKED = 'This student is already linked as a family member'

/**
 * A family member who is a student too is linked rather than typed: their name
 * and gender are copied from that student, so the row still reads right if the
 * student is ever deleted, while the family tab shows the student's live details.
 * Input without the field leaves an existing link alone.
 */
export async function withLinkedStudent<T extends Partial<CreateContactInput>>(
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

/** The student's own page and every linked student's page, which shows the link from the other side. */
export function revalidateFamilyPages(studentId: string, linkedIds: (string | null | undefined)[]) {
  revalidatePath(`/students/${studentId}`)
  for (const id of new Set(linkedIds.filter(Boolean))) revalidatePath(`/students/${id}`)
}

type SupabaseServer = ReturnType<typeof createClient>

/** The contact fields a merged parent keeps: anything the kept record lacks is taken from the other. */
const PARENT_FIELDS = [
  'title_id', 'surname', 'first_name', 'gender', 'telephone', 'mobile', 'fax', 'email_1', 'email_2', 'email_3',
  'address_1', 'address_2', 'occupation', 'office_telephone', 'office_fax', 'priority', 'remarks',
] as const

type ParentFields = Pick<Tables<'student_contacts'>, (typeof PARENT_FIELDS)[number]>
type ParentRow = ParentFields & {
  id: string; student_id: string; created_at: string | null
  first_name: string | null; surname: string | null; mobile: string | null; telephone: string | null; email_1: string | null
  relationship: { code: string } | null
}

/** The students linked to this one as brother or sister, whichever side made the link. */
export async function siblingIdsOf(supabase: SupabaseServer, studentId: string): Promise<string[]> {
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
export async function mergeSiblingParents(supabase: SupabaseServer, firstId: string, secondId: string): Promise<void> {
  const { data, error } = await supabase
    .from('student_contacts')
    .select(`id, student_id, created_at, ${PARENT_FIELDS.join(', ')}, relationship:contact_relationships!student_contacts_relationship_id_fkey(code)`)
    .in('student_id', [firstId, secondId])
    .is('related_student_id', null)
  if (error) { console.error('Could not read parents to merge:', error.message); return }
  const parents = ((data ?? []) as unknown as ParentRow[]).filter(row => row.relationship && PARENT_CODES.has(row.relationship.code))
  const merges = parentMerges(parents.filter(p => p.student_id === firstId), parents.filter(p => p.student_id === secondId))
  for (const { keep, drop } of merges) {
    const patch = fillBlanks<ParentFields>(keep, drop, [...PARENT_FIELDS])
    if (Object.keys(patch).length > 0) {
      const { error: updateError } = await supabase.from('student_contacts').update(patch).eq('id', keep.id)
      if (updateError) { console.error('Could not merge parent details:', updateError.message); continue }
    }
    const { error: deleteError } = await supabase.from('student_contacts').delete().eq('id', drop.id)
    if (deleteError) console.error('Could not remove the duplicate parent:', deleteError.message)
  }
}

/** Links a new student to an existing brother or sister; returns an error message, or null. */
export async function linkSibling(supabase: SupabaseServer, studentId: string, siblingId: string, relationship: 'brother' | 'sister'): Promise<string | null> {
  const { data: rel } = await supabase.from('contact_relationships').select('id').eq('code', relationship).maybeSingle()
  if (!rel) return 'the brother/sister relationship is missing'
  const linked = await withLinkedStudent({ related_student_id: siblingId }, studentId)
  if ('error' in linked) return linked.error
  const { error } = await supabase.from('student_contacts').insert({
    student_id: studentId, relationship_id: (rel as { id: number }).id, ...linked.input,
  })
  if (error) return error.code === UNIQUE_VIOLATION ? ALREADY_LINKED : error.message
  await mergeSiblingParents(supabase, studentId, siblingId)
  revalidateFamilyPages(studentId, [siblingId, ...(await siblingIdsOf(supabase, siblingId))])
  return null
}
