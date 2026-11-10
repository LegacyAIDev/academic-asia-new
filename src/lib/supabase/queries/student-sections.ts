import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export type StudentSectionCounts = {
  applications: number | null
  family: number | null
  education: number | null
  documents: number | null
  communications: number | null
  events: number | null
  immigration: number | null
}

/**
 * How many records each section of a student holds, for the section bar. Head
 * counts only, so the page can load just the open section and still show what
 * the others contain. A count that fails is null and shows no number.
 */
export async function getStudentSectionCounts(studentId: string): Promise<StudentSectionCounts> {
  const supabase = createClient(await cookies())
  const count = async (table: string, archivedColumn?: string) => {
    let query = supabase.from(table as 'students').select('id', { count: 'exact', head: true }).eq('student_id' as 'id', studentId)
    if (archivedColumn) query = query.is(archivedColumn as 'id', null)
    const { count: n, error } = await query
    if (error) console.error(`Section count failed (${table}):`, error.message)
    return error ? null : n ?? 0
  }
  const sum = (...values: (number | null)[]) => (values.some(v => v === null) ? null : values.reduce<number>((a, b) => a + (b ?? 0), 0))

  const [applications, family, education, exams, documents, communications, events, visas, travel] = await Promise.all([
    count('student_applications'),
    count('student_contacts'),
    count('student_education'),
    count('student_exam_results'),
    count('student_documents'),
    count('filed_emails', 'archived_at'),
    count('student_event_applications'),
    count('student_visas'),
    count('student_travel'),
  ])
  return { applications, family, education: sum(education, exams), documents, communications, events, immigration: sum(visas, travel) }
}
