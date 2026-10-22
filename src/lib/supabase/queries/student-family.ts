import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { studentSearchFilter, studentSearchWords } from '@/lib/students/student-search'

/** A student as the family tab and the student picker show them: enough to tell namesakes apart. */
export type LinkedStudent = {
  id: string
  student_code: string | null
  first_name: string
  surname: string
  chinese_name: string | null
  gender: string | null
  date_of_birth: string | null
  present_school: string | null
}

/** A family link another student made to this one: their contact row points here. */
export type FamilyLinkToStudent = {
  contactId: string
  relationshipCode: string | null
  student: LinkedStudent
}

/**
 * Students holding every typed word in their names or code, for linking a family
 * member. The student being edited is left out. 26,000+ students are far too
 * many to send to the browser, so the picker asks here as staff type. Throws when
 * the search fails, so the picker can say so instead of showing "no matches".
 */
export async function searchStudentsForFamily(query: string, excludeId: string, limit = 20): Promise<LinkedStudent[]> {
  const words = studentSearchWords(query)
  if (words.length === 0) return []

  const supabase = createClient(await cookies())
  let request = supabase
    .from('students')
    .select('id, student_code, first_name, surname, chinese_name, gender, date_of_birth, present_school')
    .neq('id', excludeId)
  // Each .or() is one more condition the row must meet, so every word has to match somewhere.
  for (const word of words) request = request.or(studentSearchFilter(word))

  const { data, error } = await request.order('surname').order('first_name').limit(limit)
  if (error) throw new Error(error.message)
  return data ?? []
}

/** The links other students made to this one, for showing the family from both sides. */
export async function getFamilyLinksToStudent(studentId: string): Promise<FamilyLinkToStudent[]> {
  const supabase = createClient(await cookies())
  const { data, error } = await supabase
    .from('student_contacts')
    .select(`
      id,
      relationship:contact_relationships!student_contacts_relationship_id_fkey(code),
      student:students!student_contacts_student_id_fkey(id, student_code, first_name, surname, chinese_name, gender, date_of_birth, present_school)
    `)
    .eq('related_student_id', studentId)

  if (error) {
    console.error('Error fetching family links to student:', error)
    return []
  }
  // Both embeds point at one row each; the generated types cannot tell, so the shape is stated here.
  const rows = (data ?? []) as unknown as { id: string; relationship: { code: string } | null; student: LinkedStudent | null }[]
  return rows
    .filter((row) => row.student)
    .map((row) => ({ contactId: row.id, relationshipCode: row.relationship?.code ?? null, student: row.student! }))
}

/**
 * The student a family member is being linked to, or null when there is none.
 * Throws when the read fails, so the save does not report a real student as missing.
 */
export async function getLinkedStudent(id: string): Promise<LinkedStudent | null> {
  const supabase = createClient(await cookies())
  const { data, error } = await supabase
    .from('students')
    .select('id, student_code, first_name, surname, chinese_name, gender, date_of_birth, present_school')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}
