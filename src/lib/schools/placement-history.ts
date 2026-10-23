import { TZDate } from '@date-fns/tz'

/**
 * Shapes the per-year counts of a school's applications, offers, accepted
 * offers and placements into what the "Placement history" card shows: a year
 * choice, the five figures of that year, and a per-year table with a total.
 * The counting itself is done by the database (see the school_placement_history
 * function); this only presents it.
 */

export type PlacementYearCounts = {
  /** The year the academic year starts in (2026 for 2026–27), or null when the application has no entry year. */
  academic_year_start: number | null
  applications: number
  offers: number
  accepted: number
  placed: number
}

type Figures = Omit<PlacementYearCounts, 'academic_year_start'>

export type PlacementRow = { label: string; applications: number; offers: number; accepted: number; placed: number; rate: string }

export type PlacementYearOption = { key: string; label: string }

/** 2026 → "2026–27", as the school year is written; null → "No entry year". */
export function academicYearLabel(start: number | null): string {
  if (start === null) return 'No entry year'
  return `${start}–${String((start + 1) % 100).padStart(2, '0')}`
}

/** Accepted offers as a share of applications, to one decimal; a dash when there is nothing to divide by. */
export function placementRate(accepted: number, applications: number): string {
  if (applications <= 0) return '—'
  return `${((accepted / applications) * 100).toFixed(1)}%`
}

/** The academic year starts on 1 September in Hong Kong, where the school year is counted. */
export function currentAcademicYearStart(now: Date = new Date()): number {
  const hongKong = new TZDate(now, 'Asia/Hong_Kong')
  return hongKong.getMonth() >= 8 ? hongKong.getFullYear() : hongKong.getFullYear() - 1
}

function toRow(label: string, figures: Figures): PlacementRow {
  return { label, ...figures, rate: placementRate(figures.accepted, figures.applications) }
}

function sumOf(counts: Figures[]): Figures {
  return counts.reduce(
    (total, year) => ({
      applications: total.applications + year.applications,
      offers: total.offers + year.offers,
      accepted: total.accepted + year.accepted,
      placed: total.placed + year.placed,
    }),
    { applications: 0, offers: 0, accepted: 0, placed: 0 },
  )
}

/** Newest year first, applications without an entry year last. */
function newestFirst(counts: PlacementYearCounts[]): PlacementYearCounts[] {
  return [...counts].sort((a, b) => {
    if (a.academic_year_start === null || b.academic_year_start === null) {
      return a.academic_year_start === b.academic_year_start ? 0 : a.academic_year_start === null ? 1 : -1
    }
    return b.academic_year_start - a.academic_year_start
  })
}

/** Rows for the table, plus a total whose rate is worked out from the summed counts rather than averaged. */
export function toPlacementRows(counts: PlacementYearCounts[]): { rows: PlacementRow[]; total: PlacementRow | null } {
  if (counts.length === 0) return { rows: [], total: null }
  return {
    rows: newestFirst(counts).map(({ academic_year_start, ...figures }) => toRow(academicYearLabel(academic_year_start), figures)),
    total: toRow('All years', sumOf(counts)),
  }
}

/** Key of a year in the select: the start year, 'none' for no entry year, 'all' for every year. */
export function yearKey(start: number | null): string {
  return start === null ? 'none' : String(start)
}

/** Every year with applications newest first, then "No entry year" when present, then "All years". */
export function placementYearOptions(counts: PlacementYearCounts[]): PlacementYearOption[] {
  return [
    ...newestFirst(counts).map(year => ({ key: yearKey(year.academic_year_start), label: academicYearLabel(year.academic_year_start) })),
    { key: 'all', label: 'All years' },
  ]
}

/** The current academic year when it has applications, else the newest year with data, else all years. */
export function defaultPlacementYear(counts: PlacementYearCounts[], currentStart: number): string {
  const years = counts.map(c => c.academic_year_start).filter((y): y is number => y !== null)
  if (years.includes(currentStart)) return String(currentStart)
  if (years.length > 0) return String(Math.max(...years))
  return 'all'
}

/** The five figures of one choice from the select; an unknown key shows no applications. */
export function figuresForYear(counts: PlacementYearCounts[], key: string): PlacementRow {
  const chosen = key === 'all' ? counts : counts.filter(c => yearKey(c.academic_year_start) === key)
  // The label follows the key, not the matches, so a year with no data still reads as that year.
  const year = Number(key)
  const label = key === 'all' ? 'All years'
    : key === 'none' ? academicYearLabel(null)
    : Number.isInteger(year) ? academicYearLabel(year) : key
  return toRow(label, sumOf(chosen))
}
