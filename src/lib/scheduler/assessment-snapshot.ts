import { z } from 'zod'

/**
 * What an examination booking remembers about its assessment: a label, free
 * notes and the papers chosen from the school's entrance exams. The papers are
 * copied in (subject, year level, duration), so a booking still reads correctly
 * after the school's exam list changes. Whether a paper file is available is
 * deliberately not stored here: files are uploaded after the booking is made.
 */

export const MAX_SNAPSHOT_PAPERS = 20
const MAX_LABEL_LENGTH = 200

export const assessmentPaperSchema = z.object({
  /** school_entrance_exams.id */
  id: z.string().uuid(),
  subject: z.string().trim().min(1).max(200),
  year_level: z.string().max(50).nullable().optional(),
  entry_year: z.string().max(20).nullable().optional(),
  duration_minutes: z.number().int().positive().nullable().optional(),
})
export type SnapshotPaper = z.infer<typeof assessmentPaperSchema>

export const assessmentSnapshotSchema = z.object({
  label: z.string().trim().max(MAX_LABEL_LENGTH).default(''),
  version: z.string().max(50).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  papers: z.array(assessmentPaperSchema).max(MAX_SNAPSHOT_PAPERS).default([]),
})
export type AssessmentSnapshot = z.output<typeof assessmentSnapshotSchema>

/** "English", "English and Mathematics", "English, Mathematics and Reasoning"; each subject once. */
export function snapshotLabelFromPapers(papers: { subject: string }[]): string {
  const subjects = [...new Set(papers.map(paper => paper.subject.trim()).filter(Boolean))]
  if (subjects.length <= 1) return subjects[0] ?? ''
  return `${subjects.slice(0, -1).join(', ')} and ${subjects[subjects.length - 1]}`
}

/**
 * The label to keep when the chosen papers change. A label that was never
 * typed, or still equals the name derived from the previous papers, is cleared
 * so it gets named after the new papers on save; a label someone wrote stays.
 */
export function labelAfterPaperChange(label: string | null | undefined, previousPapers: { subject: string }[]): string {
  const typed = label?.trim() ?? ''
  return typed === snapshotLabelFromPapers(previousPapers) ? '' : typed
}

/** The papers stored with a booking, read defensively because the column is free-form JSON. */
export function snapshotPapers(snapshot: unknown): SnapshotPaper[] {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return []
  const papers = (snapshot as { papers?: unknown }).papers
  if (!Array.isArray(papers)) return []
  return papers.flatMap(paper => {
    const parsed = assessmentPaperSchema.safeParse(paper)
    return parsed.success ? [parsed.data] : []
  })
}

/**
 * Tidies a snapshot before it is saved. An untouched assessment block becomes
 * null instead of an empty object, and a snapshot without a typed label is
 * named after its papers, so everything that prints the label keeps working.
 */
export function normaliseAssessmentSnapshot(snapshot: AssessmentSnapshot | null | undefined): AssessmentSnapshot | null {
  if (!snapshot) return null
  const version = snapshot.version?.trim() || null
  const notes = snapshot.notes?.trim() || null
  const papers = snapshot.papers ?? []
  const typed = snapshot.label.trim()
  if (!typed && papers.length === 0 && !version && !notes) return null

  const label = typed || snapshotLabelFromPapers(papers).slice(0, MAX_LABEL_LENGTH) || 'Assessment'
  return { label, version, notes, papers }
}
