import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import {
  SUMMARY_SELECT, applicationLabel, toFiledEmailSummary, type FiledEmailRow, type FiledEmailSummary,
} from '@/lib/emails/filed-email'

/**
 * Reads for the Communications tab and the application page. Pages call these
 * after their own requireAccess, so the module check has already happened.
 */

/** Newest emails first, archived included (the list hides them until asked). */
export const MAX_LISTED_EMAILS = 500

export type EmailListTarget = { studentId: string } | { schoolId: string } | { applicationId: string }

const COLUMN = { studentId: 'student_id', schoolId: 'school_id', applicationId: 'application_id' } as const

/** The record's filed emails, or null when they could not be read, so the tab can say so. */
export async function getFiledEmails(target: EmailListTarget): Promise<FiledEmailSummary[] | null> {
  const [key, id] = Object.entries(target)[0] as [keyof typeof COLUMN, string]
  const supabase = createClient(await cookies())
  const { data, error } = await supabase
    .from('filed_emails')
    .select(SUMMARY_SELECT)
    .eq(COLUMN[key], id)
    .order('sent_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(MAX_LISTED_EMAILS)
  if (error) {
    console.error('Error loading filed emails:', error.message)
    return null
  }
  return (data as unknown as FiledEmailRow[]).map(toFiledEmailSummary)
}

/** Live (not archived) emails on a record, for the count on its tab (EF-14); 0 when it cannot be read. */
export async function getFiledEmailCount(target: EmailListTarget): Promise<number> {
  const [key, id] = Object.entries(target)[0] as [keyof typeof COLUMN, string]
  const supabase = createClient(await cookies())
  const { count, error } = await supabase
    .from('filed_emails')
    .select('id', { count: 'exact', head: true })
    .eq(COLUMN[key], id)
    .is('archived_at', null)
  if (error) {
    console.error('Error counting filed emails:', error.message)
    return 0
  }
  return count ?? 0
}

/**
 * Ids of the record's emails whose full text contains every word, for search
 * beyond the preview the list carries (EF-16). LIKE wildcards are matched literally.
 */
export async function searchFiledEmailBodies(target: EmailListTarget, query: string): Promise<string[]> {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6)
    .map(w => w.slice(0, 100).replace(/[\\%_]/g, c => `\\${c}`))
  if (words.length === 0) return []
  const [key, id] = Object.entries(target)[0] as [keyof typeof COLUMN, string]
  const supabase = createClient(await cookies())
  let request = supabase.from('filed_emails').select('id').eq(COLUMN[key], id)
  for (const word of words) request = request.ilike('body_text', `%${word}%`)
  const { data, error } = await request.limit(MAX_LISTED_EMAILS)
  if (error) throw new Error(error.message)
  return (data ?? []).map(row => row.id)
}

export type ApplicationOption = { id: string; label: string; schoolId: string; schoolName: string }

type ApplicationOptionRow = {
  id: string
  entry_year: number | null
  school_id: string
  school: { name: string | null } | null
}

export function toApplicationOption(row: ApplicationOptionRow): ApplicationOption {
  return {
    id: row.id,
    label: applicationLabel(row),
    schoolId: row.school_id,
    schoolName: row.school?.name?.trim() || 'School',
  }
}

/** A student's applications, newest entry first, for the "Application" and "School" choices. */
export async function getApplicationOptions(studentId: string): Promise<ApplicationOption[]> {
  const supabase = createClient(await cookies())
  const { data, error } = await supabase
    .from('student_applications')
    .select('id, entry_year, school_id, school:schools!student_applications_school_id_fkey(name)')
    .eq('student_id', studentId)
    .order('entry_year', { ascending: false, nullsFirst: false })
    .limit(200)
  if (error) {
    console.error('Error loading application options:', error.message)
    return []
  }
  return (data as unknown as ApplicationOptionRow[]).map(toApplicationOption)
}

/** Schools by name for the link picker. LIKE wildcards in the typed text are matched literally. */
export async function searchSchoolOptions(query: string, limit = 20): Promise<{ id: string; name: string }[]> {
  const term = query.trim().slice(0, 100).replace(/[\\%_]/g, c => `\\${c}`)
  if (term.length < 2) return []
  const supabase = createClient(await cookies())
  const { data, error } = await supabase
    .from('schools')
    .select('id, name')
    .ilike('name', `%${term}%`)
    .order('name')
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []).map(s => ({ id: s.id, name: s.name?.trim() || 'School' }))
}
