import type { ExamDeskParams, ExamDeskSortKey, SortDirection } from './exam-page-search-params'
import type { ExamDeskRow } from './exam-desk-rows'

/**
 * Filtering, searching and sorting of the exam desk. The desk loads one date
 * range and does the rest here in memory: a day holds a few dozen exams at
 * most, and it keeps every rule in one testable place.
 */

export type ExamDeskOption = { id: string; label: string }
export type ExamDeskOptions = { rooms: ExamDeskOption[]; schools: ExamDeskOption[]; entryYears: number[] }

const compareText = (a: string, b: string) => a.localeCompare(b, 'en', { sensitivity: 'base', numeric: true })

function uniqueOptions(pairs: [string | null, string | null | undefined][]): ExamDeskOption[] {
  const byId = new Map<string, string>()
  for (const [id, label] of pairs) {
    if (id && !byId.has(id)) byId.set(id, label || 'Unnamed')
  }
  return [...byId].map(([id, label]) => ({ id, label })).sort((a, b) => compareText(a.label, b.label))
}

/** Filter choices come from the rows of the chosen dates, so a filter never offers a value that matches nothing. */
export function deriveExamDeskOptions(rows: ExamDeskRow[]): ExamDeskOptions {
  const years = new Set(rows.map(row => row.entryYear).filter((year): year is number => year !== null))
  return {
    rooms: uniqueOptions(rows.map(row => [row.roomId, row.room?.display_name])),
    schools: uniqueOptions(rows.map(row => [row.schoolId, row.schoolName])),
    entryYears: [...years].sort((a, b) => b - a),
  }
}

/**
 * Drops a room, school or year that is not among the choices any more, for
 * example after the dates changed. Without this the select would read "All
 * rooms" while a filter nobody can see keeps the list empty.
 */
export function reconcileExamDeskFilters(params: ExamDeskParams, options: ExamDeskOptions): ExamDeskParams {
  return {
    ...params,
    roomId: options.rooms.some(o => o.id === params.roomId) ? params.roomId : null,
    schoolId: options.schools.some(o => o.id === params.schoolId) ? params.schoolId : null,
    entryYear: params.entryYear !== null && options.entryYears.includes(params.entryYear) ? params.entryYear : null,
  }
}

export function filterExamDeskRows(
  rows: ExamDeskRow[],
  filters: Pick<ExamDeskParams, 'roomId' | 'schoolId' | 'entryYear' | 'q'>,
): ExamDeskRow[] {
  const words = filters.q.toLowerCase().split(/\s+/).filter(Boolean)
  return rows.filter(row => {
    if (filters.roomId && row.roomId !== filters.roomId) return false
    if (filters.schoolId && row.schoolId !== filters.schoolId) return false
    if (filters.entryYear !== null && row.entryYear !== filters.entryYear) return false
    return words.every(word => row.searchText.includes(word))
  })
}

type SortValue = string | number | null

const SORT_VALUES: Record<ExamDeskSortKey, (row: ExamDeskRow) => SortValue> = {
  time: row => row.startAt,
  student: row => row.candidates[0]?.sortName || null,
  school: row => row.schoolName,
  year: row => row.entryYear,
  assessment: row => row.assessment,
  room: row => (row.room ? [row.room.display_name, row.seatLabel].filter(Boolean).join(' ') : row.isOnline ? 'Online' : null),
  status: row => (row.status === 'pending' ? 0 : 1),
}

function compareValues(a: SortValue, b: SortValue): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return compareText(String(a), String(b))
}

/** Sorted copy of the rows. Rows without a value go last in both directions; ties fall back to the start time. */
export function sortExamDeskRows(rows: ExamDeskRow[], sort: ExamDeskSortKey, dir: SortDirection): ExamDeskRow[] {
  const valueOf = SORT_VALUES[sort]
  const factor = dir === 'asc' ? 1 : -1
  return [...rows].sort((rowA, rowB) => {
    const a = valueOf(rowA)
    const b = valueOf(rowB)
    if (a === null || b === null) {
      if (a !== b) return a === null ? 1 : -1
    } else {
      const order = compareValues(a, b)
      if (order !== 0) return order * factor
    }
    return compareText(rowA.startAt, rowB.startAt) || compareText(rowA.bookingId, rowB.bookingId)
  })
}

export function hasExamDeskFilters(params: Pick<ExamDeskParams, 'roomId' | 'schoolId' | 'entryYear' | 'q'>): boolean {
  return Boolean(params.roomId || params.schoolId || params.entryYear !== null || params.q)
}
