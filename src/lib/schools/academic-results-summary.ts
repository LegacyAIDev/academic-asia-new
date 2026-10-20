/**
 * Shapes a school's exam results into the summary the customer's prototype
 * shows: one block per exam type, one line per year, and the grade bands as
 * columns. Each stored row is one cumulative band ("A*–B: 78%"), so this is a
 * pivot of data we already hold, with no new fields.
 */

import type { SchoolAcademicResultWithJoins } from '@/lib/supabase/queries/school-academic-results'

export type ResultsYearRange = 'latest3' | 'last5' | 'all'

export type ResultsBlock = {
  /** Exam type code, unique per block. */
  code: string
  examType: string
  /** Column headings, narrowest band first. */
  bands: string[]
  /** Newest year first; values line up with `bands`, null where the year has no such band. */
  rows: { year: number; values: (string | null)[] }[]
}

type ResultRow = Pick<SchoolAcademicResultWithJoins, 'id' | 'exam_year' | 'grade_from' | 'grade_to' | 'result_percentage' | 'updated_at' | 'created_at' | 'exam_type'>

const YEARS_IN_RANGE: Record<ResultsYearRange, number> = { latest3: 3, last5: 5, all: Number.POSITIVE_INFINITY }

/**
 * Grades from best to worst on the scales in the data: A Level/GCSE letters,
 * GCSE numbers, Pre-U words and points, IB higher and standard level. Anything
 * else sorts after these by name.
 */
const GRADE_ORDER = [
  'A*', 'A', 'B', 'C', 'D', 'E', 'U',
  '9', '8', '7', '6', '5', '4', '3', '2', '1',
  'Distinction', 'Merit', 'Pass', 'D1', 'D2', 'D3', 'M1', 'M2', 'M3', 'P1', 'P2', 'P3',
  'HL 7', 'HL 6', 'HL 5', 'HL 4', 'HL 3', 'HL 2', 'HL 1', 'SL 7', 'SL 6', 'SL 5', 'SL 4', 'SL 3', 'SL 2', 'SL 1',
]
const GRADE_RANK = new Map(GRADE_ORDER.map((grade, index) => [grade, index]))

const isIb = (examCode: string | null | undefined) => examCode === 'ib'

/** "A*", "A*–B"; a row without a band is the IB average point score or an overall figure. */
export function bandLabel(gradeFrom: string | null, gradeTo: string | null, examCode: string | null | undefined): string {
  if (!gradeFrom) return isIb(examCode) ? 'Average points' : 'Overall'
  return gradeTo ? `${gradeFrom}–${gradeTo}` : gradeFrom
}

/** "91%"; the IB average point score is a number of points (out of 45), never a percentage. */
export function formatResultValue(value: string | null, gradeFrom: string | null, examCode: string | null | undefined): string {
  if (value == null || value.trim() === '') return '—'
  // Number() rather than parseFloat(): "12abc" is shown as typed, not as "12%".
  const number = Number(value)
  if (Number.isNaN(number)) return value
  return !gradeFrom && isIb(examCode) ? String(number) : `${number}%`
}

function compareGrades(a: string | null, b: string | null): number {
  if (a === b) return 0
  if (a === null) return -1 // a single grade ("A*") comes before the ranges that start with it
  if (b === null) return 1
  const rankA = GRADE_RANK.get(a)
  const rankB = GRADE_RANK.get(b)
  if (rankA !== undefined && rankB !== undefined) return rankA - rankB
  if (rankA !== undefined) return -1
  if (rankB !== undefined) return 1
  return a.localeCompare(b, 'en', { numeric: true })
}

type Band = { from: string | null; to: string | null; label: string }

/** Narrowest first: by the top grade, then by how far down the band reaches. Rows without a band go last. */
function compareBands(a: Band, b: Band): number {
  if (!a.from || !b.from) return a.from === b.from ? 0 : a.from ? -1 : 1
  return compareGrades(a.from, b.from) || compareGrades(a.to, b.to)
}

const BLOCK_ORDER = ['gcse', 'a_level']

function compareBlocks(a: { code: string; label: string }, b: { code: string; label: string }): number {
  const rankA = BLOCK_ORDER.indexOf(a.code)
  const rankB = BLOCK_ORDER.indexOf(b.code)
  if (rankA !== -1 || rankB !== -1) return (rankA === -1 ? Infinity : rankA) - (rankB === -1 ? Infinity : rankB)
  return a.label.localeCompare(b.label)
}

const freshness = (row: ResultRow) => row.updated_at ?? row.created_at ?? ''

/** True when `row` should replace `kept` as the shown record; the id settles equal timestamps so the query order does not. */
const isNewer = (row: ResultRow, kept: ResultRow) =>
  freshness(row) > freshness(kept) || (freshness(row) === freshness(kept) && row.id > kept.id)

/**
 * Blocks for the summary view: GCSE, then A Level, then the other exam types by
 * name. The range counts the most recent years that have results for that exam
 * type, so a gap in the data does not empty the table. When a year has the same
 * band twice, the most recently updated record is shown.
 */
export function summariseAcademicResults(results: ResultRow[], range: ResultsYearRange): ResultsBlock[] {
  const byType = new Map<string, { code: string; label: string; rows: ResultRow[] }>()
  for (const row of results) {
    if (row.exam_year == null) continue
    const code = row.exam_type?.code ?? 'unknown'
    const entry = byType.get(code) ?? { code, label: row.exam_type?.label ?? 'Other', rows: [] }
    entry.rows.push(row)
    byType.set(code, entry)
  }

  return [...byType.values()].sort(compareBlocks).map(({ code, label, rows }) => {
    const years = [...new Set(rows.map(r => r.exam_year as number))].sort((a, b) => b - a).slice(0, YEARS_IN_RANGE[range])
    const yearSet = new Set(years)
    const shown = rows.filter(r => yearSet.has(r.exam_year as number))

    const bands = new Map<string, Band>()
    for (const row of shown) {
      const bandKey = bandLabel(row.grade_from, row.grade_to, code)
      if (!bands.has(bandKey)) bands.set(bandKey, { from: row.grade_from, to: row.grade_to, label: bandKey })
    }
    const columns = [...bands.values()].sort(compareBands).map(band => band.label)

    const latest = new Map<string, ResultRow>()
    for (const row of shown) {
      const key = `${row.exam_year}|${bandLabel(row.grade_from, row.grade_to, code)}`
      const kept = latest.get(key)
      if (!kept || isNewer(row, kept)) latest.set(key, row)
    }

    return {
      code,
      examType: label,
      bands: columns,
      rows: years.map(year => ({
        year,
        values: columns.map(column => {
          const row = latest.get(`${year}|${column}`)
          return row ? formatResultValue(row.result_percentage, row.grade_from, code) : null
        }),
      })),
    }
  })
}
