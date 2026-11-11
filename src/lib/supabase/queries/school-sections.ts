import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { SchoolTabKey } from '@/lib/schools/school-tabs'

export type SchoolSectionCounts = Partial<Record<SchoolTabKey, number | null>>

/**
 * How many records each section of a school holds, for the section bar: head
 * counts only, filtered as each section's own list is. A count that fails is
 * null and shows no number.
 */
export async function getSchoolSectionCounts(schoolId: string): Promise<SchoolSectionCounts> {
  const supabase = createClient(await cookies())
  type Filter = (q: ReturnType<typeof base>) => ReturnType<typeof base>
  const base = (table: string) =>
    supabase.from(table as 'schools').select('id', { count: 'exact', head: true }).eq('school_id' as 'id', schoolId)
  const count = async (table: string, filter: Filter = q => q) => {
    const { count: n, error } = await filter(base(table))
    if (error) console.error(`School section count failed (${table}):`, error.message)
    return error ? null : n ?? 0
  }
  const sum = (...values: (number | null)[]) => (values.some(v => v === null) ? null : values.reduce<number>((a, b) => a + (b ?? 0), 0))

  const [entrance, fees, results, contacts, events, notes, info, documents, emails, courses, bank, visits] = await Promise.all([
    count('school_entrance_exams'),
    count('school_fees'),
    count('school_academic_results'),
    count('school_contacts', q => q.eq('is_active' as 'id', true as unknown as string)),
    count('event_schools'),
    count('school_notes'),
    count('school_supplementary_info'),
    count('school_documents', q => q.is('superseded_by' as 'id', null)),
    count('filed_emails', q => q.is('archived_at' as 'id', null)),
    count('school_courses'),
    count('school_bank_details'),
    count('school_visits'),
  ])
  return {
    'entrance-exams': entrance,
    fees,
    'academic-results': results,
    contacts,
    events,
    notes: sum(notes, info),
    documents,
    communications: emails,
    courses,
    'bank-details': bank,
    visits,
  }
}
