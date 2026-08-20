/**
 * Pure shaping for the comparison export. No Supabase, no I/O — given the same
 * rows it always produces the same payload, so the awkward cases can be tested
 * directly.
 *
 * Three rules here decide whether the printed sheet is honest:
 *
 *   1. The year pair is resolved ONCE PER EXAM TYPE across the whole selection,
 *      never per school. A shared column header saying "2024" must describe 2024
 *      for every school under it; a school with nothing that year prints NP.
 *      It is per exam type rather than global because the qualifications publish
 *      on different cycles — A-Level data runs a year ahead of GCSE.
 *
 *   2. GCSE changed from lettered grades (A*, A*-A, A*-B, A*-C) to numeric
 *      (9, 9-8, 9-7, 9-6, 9-5, 9-4) in 2022. They measure different things. If
 *      the two column years straddle that boundary the prior year is dropped
 *      rather than printed beside the other regime.
 *
 *   3. "Current fee" means the latest financial year that actually holds a
 *      course fee. Registration-fee-only years exist ahead of the course-fee
 *      schedule and must not be mistaken for the current year.
 */

import { compareYearLevel, yearLevelIndex } from './year-levels'
import type {
  BandFigures,
  ExamColumns,
  Figure,
  FeeBand,
  GradeBand,
  GradeRegime,
  RawAcademicResult,
  RawFee,
  SchoolFees,
} from './export-types'

/** GCSE grades became numeric from this exam year onwards. */
export const GCSE_NUMERIC_FROM = 2022

/** The IB diploma is scored out of 45; anything above is a different measure. */
export const IB_MAX_SCORE = 45

const band = (key: string, label: string, from: string, to: string | null): GradeBand => ({
  key,
  label,
  from,
  to,
})

export const GCSE_NUMERIC_BANDS: GradeBand[] = [
  band('9', '9', '9', null),
  band('9-8', '9–8', '9', '8'),
  band('9-7', '9–7', '9', '7'),
  band('9-6', '9–6', '9', '6'),
  band('9-4', '9–4', '9', '4'),
]

export const GCSE_LETTERED_BANDS: GradeBand[] = [
  band('A*', 'A*', 'A*', null),
  band('A*-A', 'A*–A', 'A*', 'A'),
  band('A*-B', 'A*–B', 'A*', 'B'),
  band('A*-C', 'A*–C', 'A*', 'C'),
]

export const A_LEVEL_BANDS: GradeBand[] = [
  band('A*', 'A*', 'A*', null),
  band('A*-A', 'A*–A', 'A*', 'A'),
  band('A*-B', 'A*–B', 'A*', 'B'),
  band('A*-C', 'A*–C', 'A*', 'C'),
  band('A*-E', 'A*–E', 'A*', 'E'),
]

export const gcseRegimeFor = (year: number): GradeRegime =>
  year >= GCSE_NUMERIC_FROM ? 'numeric' : 'lettered'

export const gcseBandsFor = (regime: GradeRegime): GradeBand[] =>
  regime === 'numeric' ? GCSE_NUMERIC_BANDS : GCSE_LETTERED_BANDS

/** Key a result row onto a band. A null grade_to means the single top grade. */
const bandKeyOf = (row: RawAcademicResult): string | null => {
  if (!row.grade_from) return null
  return row.grade_to ? `${row.grade_from}-${row.grade_to}` : row.grade_from
}

/**
 * The two years the columns will claim, taken across the whole selection.
 *
 * `current` is the most recent year any selected school published; `prior` is
 * the most recent year before it that any selected school published — not simply
 * `current - 1`, so a gap year does not produce an empty column.
 */
export function resolveYearPair(rows: RawAcademicResult[]): {
  currentYear: number | null
  priorYear: number | null
} {
  const years = [...new Set(rows.map((r) => r.exam_year).filter((y): y is number => y !== null))]
    .sort((a, b) => b - a)

  return {
    currentYear: years[0] ?? null,
    priorYear: years[1] ?? null,
  }
}

/**
 * Columns for a graded exam (GCSE or A-Level).
 *
 * For GCSE the regime is taken from the current year, and a prior year on the
 * other side of the 2022 boundary is suppressed rather than printed under a
 * header describing a different grading scale.
 */
export function resolveExamColumns(
  rows: RawAcademicResult[],
  examType: 'gcse' | 'a_level'
): ExamColumns {
  const { currentYear, priorYear } = resolveYearPair(rows)

  if (currentYear === null) {
    return {
      currentYear: null,
      priorYear: null,
      bands: examType === 'gcse' ? GCSE_NUMERIC_BANDS : A_LEVEL_BANDS,
      regime: examType === 'gcse' ? 'numeric' : undefined,
      priorYearSuppressed: false,
    }
  }

  if (examType === 'a_level') {
    return { currentYear, priorYear, bands: A_LEVEL_BANDS, priorYearSuppressed: false }
  }

  const regime = gcseRegimeFor(currentYear)
  const priorMatches = priorYear !== null && gcseRegimeFor(priorYear) === regime

  return {
    currentYear,
    priorYear: priorMatches ? priorYear : null,
    bands: gcseBandsFor(regime),
    regime,
    priorYearSuppressed: priorYear !== null && !priorMatches,
  }
}

/**
 * Figures for one school against fixed columns.
 *
 * `offers` carries what the school has told us: false means it does not run the
 * qualification (em dash), null or true with no row means nothing was published
 * (NP). Those are different claims and the sheet should not conflate them.
 */
export function toBandFigures(
  rows: RawAcademicResult[],
  columns: ExamColumns,
  offers: boolean | null
): BandFigures {
  const missing: Figure = offers === false ? { value: null, state: 'na' } : { value: null, state: 'np' }

  const byYearAndBand = new Map<string, number>()
  for (const row of rows) {
    const key = bandKeyOf(row)
    if (key === null || row.exam_year === null || row.result_percentage === null) continue
    byYearAndBand.set(`${row.exam_year}|${key}`, row.result_percentage)
  }

  const figureFor = (year: number | null, bandKey: string): Figure => {
    if (year === null) return missing
    const value = byYearAndBand.get(`${year}|${bandKey}`)
    return value === undefined ? missing : { value, state: 'ok' }
  }

  const out: BandFigures = {}
  for (const b of columns.bands) {
    out[b.key] = {
      prior: figureFor(columns.priorYear, b.key),
      current: figureFor(columns.currentYear, b.key),
    }
  }
  return out
}

/**
 * IB is stored differently from the graded exams: the average diploma score sits
 * in result_percentage on rows with no grade band.
 *
 * Two schools have instead entered per-grade percentage distributions (HL 7,
 * SL 5 …), which reach 90+ and are not diploma scores. Those rows are excluded
 * — printing one would claim an IB score above the maximum of 45.
 */
export function toIbFigures(
  rows: RawAcademicResult[],
  columns: ExamColumns,
  offers: boolean | null
): { prior: Figure; current: Figure } {
  const missing: Figure = offers === false ? { value: null, state: 'na' } : { value: null, state: 'np' }

  const byYear = new Map<number, number>()
  for (const row of rows) {
    if (row.grade_from !== null) continue
    if (row.exam_year === null || row.result_percentage === null) continue
    if (row.result_percentage <= 0 || row.result_percentage > IB_MAX_SCORE) continue
    byYear.set(row.exam_year, row.result_percentage)
  }

  const figureFor = (year: number | null): Figure => {
    if (year === null) return missing
    const value = byYear.get(year)
    return value === undefined ? missing : { value, state: 'ok' }
  }

  return { prior: figureFor(columns.priorYear), current: figureFor(columns.currentYear) }
}

/** Columns for IB, which carries no grade bands. */
export function resolveIbColumns(rows: RawAcademicResult[]): ExamColumns {
  const usable = rows.filter(
    (r) =>
      r.grade_from === null &&
      r.result_percentage !== null &&
      r.result_percentage > 0 &&
      r.result_percentage <= IB_MAX_SCORE
  )
  const { currentYear, priorYear } = resolveYearPair(usable)
  return { currentYear, priorYear, bands: [], priorYearSuppressed: false }
}

/**
 * The fee to print: the latest financial year that actually contains a course
 * fee. Years holding only a registration fee run ahead of the course-fee
 * schedule, so taking the newest year outright would show a deposit as if it
 * were the annual fee.
 *
 * Bands are ordered by starting year level using the explicit ordinal in
 * year-levels.ts — a string sort puts "Year 10" before "Year 9".
 */
export function resolveCurrentFee(fees: RawFee[], courseFeeTypeId: number): SchoolFees | null {
  const courseFees = fees.filter(
    (f) =>
      f.fee_type_id === courseFeeTypeId &&
      f.financial_year &&
      // A zero or negative amount is a placeholder row, not a fee.
      f.amount !== null &&
      f.amount > 0
  )
  if (courseFees.length === 0) return null

  const latestYear = courseFees
    .map((f) => f.financial_year as string)
    .sort((a, b) => b.localeCompare(a))[0]

  const bands: FeeBand[] = courseFees
    .filter((f) => f.financial_year === latestYear)
    .map((f) => ({
      yearLevelFrom: f.year_level_from,
      yearLevelTo: f.year_level_to,
      amount: f.amount as number,
    }))
    .sort((a, b) => compareYearLevel(a.yearLevelFrom, b.yearLevelFrom))

  // Fee remarks repeat across the year's rows; the first non-empty one is the
  // note that belongs to the fee as a whole ("Fee inclusive of VAT").
  const remark =
    courseFees
      .filter((f) => f.financial_year === latestYear)
      .map((f) => f.remarks?.trim())
      .find((r): r is string => Boolean(r)) ?? null

  return { financialYear: latestYear, bands: mergeFeeBands(bands), remark }
}

/**
 * Collapse runs of adjacent year levels charged the same amount into one band.
 *
 * Fees are stored one row per year level, so a school with a flat senior fee has
 * five rows. The sheet prints "Year 9 – Year 13  £56,430", not five identical
 * lines — and a school that really does charge differently for sixth form still
 * ends up with the two bands it should have.
 *
 * Only merges where the year levels are genuinely contiguous, so a gap in the
 * schedule is never papered over.
 */
export function mergeFeeBands(bands: FeeBand[]): FeeBand[] {
  const merged: FeeBand[] = []

  for (const current of bands) {
    const previous = merged[merged.length - 1]
    const previousEnd = yearLevelIndex(previous?.yearLevelTo ?? previous?.yearLevelFrom ?? null)
    const currentStart = yearLevelIndex(current.yearLevelFrom)

    const contiguous =
      previous !== undefined &&
      previous.amount === current.amount &&
      previousEnd !== null &&
      currentStart !== null &&
      currentStart === previousEnd + 1

    if (contiguous) {
      previous.yearLevelTo = current.yearLevelTo ?? current.yearLevelFrom
    } else {
      merged.push({ ...current })
    }
  }

  return merged
}

/** Boarding share of the roll. Null rather than 0 when the roll is unknown. */
export function boardingPercent(
  pupilCount: number | null,
  boarderCount: number | null
): number | null {
  if (!pupilCount || pupilCount <= 0 || boarderCount === null) return null
  return Math.round((boarderCount / pupilCount) * 100)
}
