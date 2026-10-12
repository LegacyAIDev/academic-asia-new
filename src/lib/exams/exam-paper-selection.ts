import type { SnapshotPaper } from '@/lib/scheduler/assessment-snapshot'
import type { ExamPaperOption } from '@/lib/supabase/queries/exam-papers'

/** Helpers for choosing a school's papers in the booking dialog and for showing what was chosen. Pure. */

const naturalOrder = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' })

function unique(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.map(value => value?.trim()).filter((value): value is string => Boolean(value)))]
}

/** What a booking keeps of a chosen paper. A paper without a subject is named so it can still be read later. */
export function toSnapshotPaper(option: ExamPaperOption): SnapshotPaper {
  return {
    id: option.id,
    subject: option.subject?.trim() || 'Paper',
    year_level: option.year_level,
    entry_year: option.entry_year,
    duration_minutes: option.duration_minutes && option.duration_minutes > 0 ? option.duration_minutes : null,
  }
}

/** Year levels of the chosen papers, each once, "Year 7" before "Year 10". */
export function paperYearLevels(papers: Pick<SnapshotPaper, 'year_level'>[]): string[] {
  return unique(papers.map(paper => paper.year_level)).sort(naturalOrder)
}

/** Total sitting time of the chosen papers, or null when none of them states a duration. */
export function totalPaperMinutes(papers: Pick<SnapshotPaper, 'duration_minutes'>[]): number | null {
  const minutes = papers.map(paper => paper.duration_minutes ?? 0).reduce((sum, value) => sum + value, 0)
  return minutes > 0 ? minutes : null
}

/** Choices for the two filters above the paper list: entry years newest first, year levels in natural order. */
export function paperFilterOptions(options: ExamPaperOption[]): { entryYears: string[]; yearLevels: string[] } {
  return {
    entryYears: unique(options.map(option => option.entry_year)).sort(naturalOrder).reverse(),
    yearLevels: unique(options.map(option => option.year_level)).sort(naturalOrder),
  }
}

/** The papers shown in the list for the chosen filters; an empty filter matches everything. */
export function filterPaperOptions(options: ExamPaperOption[], entryYear: string | null, yearLevel: string | null): ExamPaperOption[] {
  return options.filter(option =>
    (!entryYear || option.entry_year === entryYear) && (!yearLevel || option.year_level === yearLevel))
}
