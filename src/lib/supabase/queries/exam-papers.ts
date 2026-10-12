import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { EXAM_PAPER_ATTACHABLE_TYPE } from '@/lib/attachments/exam-paper-access'
import { inBatches } from './scheduler-calendar-helpers'

/** One entrance exam paper of a school as offered in the booking dialog: its format, never its files. */
export type ExamPaperOption = {
  id: string
  subject: string | null
  year_level: string | null
  entry_year: string | null
  duration_minutes: number | null
  exam_format: string | null
  paper_request_from_school: boolean
}

/** Whether a paper can be printed today: counts only, so it is safe to show outside the exam team. */
export type ExamPaperStatus = { requestFromSchool: boolean; files: number; links: number }

/** A school can hold several hundred papers across years; the dialog narrows them by entry year and year level. */
const MAX_PAPER_OPTIONS = 1000

/** A school's entrance exam papers, newest entry year first. */
export async function getSchoolExamPaperOptions(schoolId: string): Promise<ExamPaperOption[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('school_entrance_exams')
    .select('id, subject, year_level, entry_year, duration_minutes, exam_format, paper_request_from_school')
    .eq('school_id', schoolId)
    .order('entry_year', { ascending: false })
    .order('year_level')
    .order('subject')
    .limit(MAX_PAPER_OPTIONS)

  if (error) {
    console.error('getSchoolExamPaperOptions failed:', error)
    return []
  }
  return (data ?? []) as ExamPaperOption[]
}

/**
 * For each paper id: is it kept by the school, and how many files and links
 * are attached. Read live because papers are uploaded after a booking is made.
 * Only numbers leave this function; file names and paths stay with the exam team.
 *
 * Returns null when the lookup failed, so callers can say "could not be checked"
 * instead of showing every paper as missing.
 */
export async function getExamPaperStatuses(paperIds: string[]): Promise<Map<string, ExamPaperStatus> | null> {
  const statuses = new Map<string, ExamPaperStatus>()
  const ids = [...new Set(paperIds)]
  if (ids.length === 0) return statuses

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  for (const batch of inBatches(ids)) {
    const [papers, attachments] = await Promise.all([
      supabase.from('school_entrance_exams').select('id, paper_request_from_school').in('id', batch),
      supabase
        .from('school_documents')
        .select('attachable_id, file_path')
        .eq('attachable_type', EXAM_PAPER_ATTACHABLE_TYPE)
        .in('attachable_id', batch),
    ])
    if (papers.error || attachments.error) {
      console.error('getExamPaperStatuses failed:', papers.error ?? attachments.error)
      return null
    }
    for (const paper of papers.data ?? []) {
      statuses.set(paper.id, { requestFromSchool: paper.paper_request_from_school, files: 0, links: 0 })
    }
    for (const attachment of (attachments.data ?? []) as { attachable_id: string | null; file_path: string | null }[]) {
      const status = attachment.attachable_id ? statuses.get(attachment.attachable_id) : undefined
      if (!status) continue
      if (attachment.file_path) status.files += 1
      else status.links += 1
    }
  }
  return statuses
}
