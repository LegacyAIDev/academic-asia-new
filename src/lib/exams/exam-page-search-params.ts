import { MAX_RANGE_DAYS } from '@/lib/scheduler/config'
import { DATE_RE, first, pick, todayInBusinessTz, type RawSearchParams } from '@/lib/scheduler/search-params'
import { isUuid } from '@/lib/scheduler/uuid'

/**
 * The exams page keeps its state in the URL, so a filtered desk can be
 * bookmarked or sent to a colleague. Both views (the day desk and the full
 * exam list) are parsed here, which keeps a link built for one from breaking
 * the other. Everything in this file is pure.
 */

export const EXAM_VIEWS = ['desk', 'all'] as const
export type ExamView = (typeof EXAM_VIEWS)[number]

export const EXAM_DESK_SORT_KEYS = ['time', 'student', 'school', 'year', 'assessment', 'papers', 'room', 'status'] as const
export type ExamDeskSortKey = (typeof EXAM_DESK_SORT_KEYS)[number]

const SORT_DIRECTIONS = ['asc', 'desc'] as const
export type SortDirection = (typeof SORT_DIRECTIONS)[number]

export type ExamDeskParams = {
  /** First and last day shown, YYYY-MM-DD in the business timezone. */
  from: string
  to: string
  /** True when the requested range was longer than allowed and had to be shortened. */
  rangeClamped: boolean
  roomId: string | null
  schoolId: string | null
  entryYear: number | null
  q: string
  sort: ExamDeskSortKey
  dir: SortDirection
}

export type ExamListParams = { statusId: number | undefined; page: number; from: string | null; to: string | null }

const MIN_YEAR = 2000
const MAX_YEAR = 2100
const MAX_SEARCH_LENGTH = 100
const DAY_MS = 86_400_000
/** Far beyond any real list, but small enough that the row offset stays a sensible number. */
const MAX_PAGE = 100_000

/** Every parameter the exams page understands, in the order links are written. */
const KNOWN_KEYS = ['view', 'from', 'to', 'room', 'school', 'year', 'q', 'sort', 'dir', 'status', 'page'] as const

/** Days since the epoch for a YYYY-MM-DD string, computed in UTC so the server's own timezone never shifts a date. */
function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / DAY_MS
}

/** Whole days from one YYYY-MM-DD date to another; negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from)
}

function addDays(date: string, days: number): string {
  return new Date((dayNumber(date) + days) * DAY_MS).toISOString().slice(0, 10)
}

/**
 * A real calendar date in a sensible year. The year check matters because a
 * date input reports "0002-03-15" while the year is still being typed.
 */
export function isDeskDate(value: string | undefined | null): value is string {
  if (!value || !DATE_RE.test(value)) return false
  const year = Number(value.slice(0, 4))
  if (year < MIN_YEAR || year > MAX_YEAR) return false
  return addDays(value, 0) === value
}

function wholeNumber(value: string | undefined, min: number, max: number): number | null {
  if (!value || !/^\d+$/.test(value)) return null
  const parsed = Number(value)
  return parsed >= min && parsed <= max ? parsed : null
}

function uuidOrNull(value: string | undefined): string | null {
  return value && isUuid(value) ? value : null
}

/** Links saved before the desk existed carry only `status` or `page`; they still open the list. */
export function resolveExamView(raw: RawSearchParams): ExamView {
  const view = first(raw.view)
  if (view === 'all' || view === 'desk') return view
  return first(raw.status) || first(raw.page) ? 'all' : 'desk'
}

export function parseExamDeskParams(raw: RawSearchParams, now: Date = new Date()): ExamDeskParams {
  const fromRaw = first(raw.from)
  const toRaw = first(raw.to)
  const from = isDeskDate(fromRaw) ? fromRaw : todayInBusinessTz(now)
  let to = isDeskDate(toRaw) && toRaw >= from ? toRaw : from

  const rangeClamped = daysBetween(from, to) > MAX_RANGE_DAYS
  if (rangeClamped) to = addDays(from, MAX_RANGE_DAYS)

  return {
    from,
    to,
    rangeClamped,
    roomId: uuidOrNull(first(raw.room)),
    schoolId: uuidOrNull(first(raw.school)),
    entryYear: wholeNumber(first(raw.year), MIN_YEAR, MAX_YEAR),
    q: (first(raw.q) ?? '').trim().slice(0, MAX_SEARCH_LENGTH),
    sort: pick(first(raw.sort), EXAM_DESK_SORT_KEYS, 'time'),
    dir: pick(first(raw.dir), SORT_DIRECTIONS, 'asc'),
  }
}

/** The full list is paged, so its date range is optional and has no length limit. */
export function parseExamListParams(raw: RawSearchParams): ExamListParams {
  const from = first(raw.from)
  const to = first(raw.to)
  return {
    statusId: wholeNumber(first(raw.status), 1, 4) ?? undefined,
    page: wholeNumber(first(raw.page), 1, MAX_PAGE) ?? 1,
    from: isDeskDate(from) ? from : null,
    to: isDeskDate(to) ? to : null,
  }
}

function toHref(entries: [string, string][]): string {
  const query = new URLSearchParams(entries).toString()
  return query ? `/exams?${query}` : '/exams'
}

/**
 * The current URL with some parameters changed (`null` removes one). It works
 * on the raw parameters on purpose: a date that was never chosen stays out of
 * the link, so a bookmarked desk keeps opening on today.
 */
export function examsHref(raw: RawSearchParams, patch: Record<string, string | number | null> = {}): string {
  const entries: [string, string][] = []
  for (const key of KNOWN_KEYS) {
    const value = key in patch ? patch[key] : first(raw[key])
    if (value !== null && value !== undefined && value !== '') entries.push([key, String(value)])
  }
  return toHref(entries)
}

/** Link into the full exam list, leaving out anything that is at its default. */
export function examListHref(p: { status?: number; page?: number; from?: string | null; to?: string | null }): string {
  const entries: [string, string][] = [['view', 'all']]
  if (p.from) entries.push(['from', p.from])
  if (p.to) entries.push(['to', p.to])
  if (p.status) entries.push(['status', String(p.status)])
  if (p.page && p.page > 1) entries.push(['page', String(p.page)])
  return toHref(entries)
}

/** Clicking the active column flips its direction; clicking another column starts ascending. */
export function nextSort<K extends string>(current: { sort: K; dir: SortDirection }, key: K): { sort: K; dir: SortDirection } {
  if (current.sort !== key) return { sort: key, dir: 'asc' }
  return { sort: key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
}
