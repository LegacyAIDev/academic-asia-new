/**
 * Shapes the per-year counts of a school's applications, offers and placements
 * into the rows of the "Placement history" card: a readable academic year, a
 * placement rate, and a total over all years. The counting itself is done by
 * the database (see the school_placement_history function); this only presents it.
 */

export type PlacementYearCounts = {
  /** The year the academic year starts in (2026 for 2026–27), or null when the application has no entry year. */
  academic_year_start: number | null
  applications: number
  offers: number
  placed: number
}

export type PlacementRow = { label: string; applications: number; offers: number; placed: number; rate: string }

/** 2026 → "2026–27", as the school year is written; null → "No entry year". */
export function academicYearLabel(start: number | null): string {
  if (start === null) return 'No entry year'
  return `${start}–${String((start + 1) % 100).padStart(2, '0')}`
}

/** Placed students as a share of applications, to one decimal; a dash when there is nothing to divide by. */
export function placementRate(placed: number, applications: number): string {
  if (applications <= 0) return '—'
  return `${((placed / applications) * 100).toFixed(1)}%`
}

function toRow(label: string, counts: Omit<PlacementYearCounts, 'academic_year_start'>): PlacementRow {
  return { label, ...counts, rate: placementRate(counts.placed, counts.applications) }
}

/**
 * Rows newest year first, applications without an entry year last, and a total
 * whose rate is worked out from the summed counts rather than averaged.
 */
export function toPlacementRows(counts: PlacementYearCounts[]): { rows: PlacementRow[]; total: PlacementRow | null } {
  if (counts.length === 0) return { rows: [], total: null }

  const ordered = [...counts].sort((a, b) => {
    if (a.academic_year_start === null || b.academic_year_start === null) {
      return a.academic_year_start === b.academic_year_start ? 0 : a.academic_year_start === null ? 1 : -1
    }
    return b.academic_year_start - a.academic_year_start
  })

  const sum = ordered.reduce(
    (total, year) => ({
      applications: total.applications + year.applications,
      offers: total.offers + year.offers,
      placed: total.placed + year.placed,
    }),
    { applications: 0, offers: 0, placed: 0 },
  )

  return {
    rows: ordered.map(({ academic_year_start, ...year }) => toRow(academicYearLabel(academic_year_start), year)),
    total: toRow('All years', sum),
  }
}
