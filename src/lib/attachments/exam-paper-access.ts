import { ACCESS, MODULES, type AccessLevel, type ModuleKey } from '@/lib/permissions/modules'

/**
 * Who may see a school's entrance exam papers.
 *
 * Papers are the most sensitive files the company holds, so they do not follow
 * the Schools rights like other school files: only the examination team (the
 * Exams write right) may list, open, attach or remove them. Everyone else still
 * sees the exam format, just not the papers. This module is the one place that
 * defines the rule; queries and actions ask it, the screens only mirror it.
 */

export type AttachAccess = {
  module: ModuleKey
  read: AccessLevel
  write: AccessLevel
  /** Restricted files get download links that expire after minutes rather than an hour. */
  restricted: boolean
}

export const EXAM_PAPER_ACCESS: AttachAccess = {
  module: MODULES.EXAMS, read: ACCESS.WRITE, write: ACCESS.WRITE, restricted: true,
}

/** document_categories.code of an entrance exam paper. */
export const EXAM_PAPER_CATEGORY_CODE = 'school_entrance_exam_paper'

/** Parent table of a paper attached to an entrance exam record. */
export const EXAM_PAPER_ATTACHABLE_TYPE = 'school_entrance_exams'

export function isExamPaperCategory(code: string | null | undefined): boolean {
  return code === EXAM_PAPER_CATEGORY_CODE
}

type DocumentRowLike = { attachable_type?: string | null; category?: { code: string } | null }

/**
 * Whether a stored document row is an exam paper. Either sign is enough: its
 * category, or the fact that it hangs off an entrance exam record.
 */
export function isExamPaperRow(row: DocumentRowLike | null | undefined): boolean {
  if (!row) return false
  return isExamPaperCategory(row.category?.code) || row.attachable_type === EXAM_PAPER_ATTACHABLE_TYPE
}
