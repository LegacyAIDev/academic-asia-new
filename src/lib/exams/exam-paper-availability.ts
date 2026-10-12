import type { SnapshotPaper } from '@/lib/scheduler/assessment-snapshot'
import type { ExamPaperStatus } from '@/lib/supabase/queries/exam-papers'

/**
 * Sums up, for the exam desk, how many of a booking's papers can be printed.
 * Each paper falls into exactly one group:
 *  - request from school: the school keeps it, we ask for it per sitting
 *  - uploaded: a file is stored with us
 *  - online: only a link is recorded (an online test or a paper kept elsewhere)
 *  - not uploaded: nothing yet, or the paper was removed from the school since
 */
export type PaperAvailability = {
  uploaded: number
  online: number
  requestFromSchool: number
  notUploaded: number
  /** e.g. "2 uploaded · 1 request from school" */
  label: string
  /** True when at least one paper has a file or a link to open. */
  canPrint: boolean
}

/** Shown when the state of the papers could not be read; nothing is claimed and nothing can be printed. */
export const UNCHECKED_AVAILABILITY: PaperAvailability = {
  uploaded: 0, online: 0, requestFromSchool: 0, notUploaded: 0, label: 'Could not be checked', canPrint: false,
}

/** `statusById` is null when the lookup failed, which must not read as "nothing uploaded". */
export function summarisePaperAvailability(
  papers: Pick<SnapshotPaper, 'id'>[],
  statusById: Map<string, ExamPaperStatus> | null,
): PaperAvailability | null {
  if (papers.length === 0) return null
  if (statusById === null) return UNCHECKED_AVAILABILITY

  const counts = { uploaded: 0, online: 0, requestFromSchool: 0, notUploaded: 0 }
  for (const paper of papers) {
    const status = statusById.get(paper.id)
    if (status?.requestFromSchool) counts.requestFromSchool += 1
    else if (status && status.files > 0) counts.uploaded += 1
    else if (status && status.links > 0) counts.online += 1
    else counts.notUploaded += 1
  }

  const label = [
    counts.uploaded > 0 ? `${counts.uploaded} uploaded` : '',
    counts.online > 0 ? `${counts.online} online` : '',
    counts.requestFromSchool > 0 ? `${counts.requestFromSchool} request from school` : '',
    counts.notUploaded > 0 ? `${counts.notUploaded} not uploaded` : '',
  ].filter(Boolean).join(' · ')

  return { ...counts, label, canPrint: counts.uploaded + counts.online > 0 }
}
