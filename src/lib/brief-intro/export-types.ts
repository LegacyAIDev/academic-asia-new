/**
 * Render contract for the Brief Introduction export.
 *
 * One payload serves every combination: a single student or a whole selection,
 * PDF or Excel. A single student is an array of one, so there is no second code
 * path that can drift from the bulk one.
 *
 * Dates stay as raw ISO strings here rather than pre-formatted text. The PDF
 * formats them for print; the spreadsheet needs real Date values or Excel sorts
 * them as strings and "1 Feb" lands before "2 Jan".
 */

export interface BriefIntroExportRow {
  studentId: string
  /** "Surname, First" — sorts naturally in both the booklet and the sheet. */
  studentName: string
  studentCode: string | null
  /** Resolved label, falling back to the migrated legacy text. */
  spokenEnglish: string
  subjects: string
  hobbies: string
  /** Sanitized on save, so it is safe to render directly in the PDF. */
  remarksHtml: string | null
  /** Same content flattened to text, for spreadsheet cells. */
  remarksText: string
  isApproved: boolean
  approvedBy: string | null
  approvedOn: string | null
  /** The consultant the introduction is assigned to. */
  consultant: string | null
  sentCount: number
  lastSentOn: string | null
  updatedOn: string | null
}

export interface BriefIntroExportPayload {
  rows: BriefIntroExportRow[]
  /**
   * Selected students with no introduction written yet. Reported in the UI so a
   * short export is never silently confusing, but never rendered into a file —
   * a blank page or an empty row reads as data loss rather than as a gap.
   */
  skipped: { studentId: string; studentName: string }[]
  preparedBy: string | null
  /** Injected rather than read from the clock, so the payload is testable. */
  generatedOn: string
}
