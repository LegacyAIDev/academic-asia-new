import { TZDate } from '@date-fns/tz'
import { addDays, endOfMonth, format, startOfMonth, startOfWeek } from 'date-fns'
import { BOOKING_TYPES, SCHEDULER_TIMEZONE, type BookingType } from './config'

/**
 * The scheduler keeps its state in the URL so views are shareable and the
 * server can fetch exactly the visible range. Everything here is pure.
 */

export const SCHEDULER_VIEWS = ['my', 'team', 'rooms'] as const
export type SchedulerView = (typeof SCHEDULER_VIEWS)[number]

export const SCHEDULER_MODES = ['week', 'day', 'month'] as const
export type SchedulerMode = (typeof SCHEDULER_MODES)[number]

export const STATUS_FILTERS = ['pending', 'confirmed', 'cancelled'] as const
export type StatusFilter = (typeof STATUS_FILTERS)[number]

export type SchedulerParams = {
  view: SchedulerView
  mode: SchedulerMode
  /** YYYY-MM-DD in the business timezone. */
  date: string
  profileIds: string[]
  studentIds: string[]
  types: BookingType[]
  roomIds: string[]
  status: StatusFilter | null
}

export type RawSearchParams = Record<string, string | string[] | undefined>

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Ids come straight from the URL and end up in PostgREST filters, so anything that is not a uuid is dropped. */
const uuids = (values: string[]) => values.filter(v => UUID_RE.test(v))

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function list(value: string | string[] | undefined): string[] {
  const raw = first(value)
  return raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : []
}

function pick<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

/** Today's date in the business timezone as YYYY-MM-DD. */
export function todayInBusinessTz(now: Date = new Date()): string {
  return format(new TZDate(now, SCHEDULER_TIMEZONE), 'yyyy-MM-dd')
}

export function parseSchedulerParams(raw: RawSearchParams, now: Date = new Date()): SchedulerParams {
  const people = list(raw.people)
  const dateRaw = first(raw.date)
  return {
    view: pick(first(raw.view), SCHEDULER_VIEWS, 'my'),
    mode: pick(first(raw.mode), SCHEDULER_MODES, 'week'),
    date: dateRaw && DATE_RE.test(dateRaw) ? dateRaw : todayInBusinessTz(now),
    profileIds: uuids(people.filter(p => p.startsWith('p:')).map(p => p.slice(2))),
    studentIds: uuids(people.filter(p => p.startsWith('s:')).map(p => p.slice(2))),
    types: list(raw.types).filter((t): t is BookingType => (BOOKING_TYPES as readonly string[]).includes(t)),
    roomIds: uuids(list(raw.rooms)),
    status: pick(first(raw.status), STATUS_FILTERS, '' as StatusFilter) || null,
  }
}

/** Builds the query string for a (partially) changed set of params, dropping defaults. */
export function serialiseSchedulerParams(params: SchedulerParams): string {
  const q = new URLSearchParams()
  if (params.view !== 'my') q.set('view', params.view)
  if (params.mode !== 'week') q.set('mode', params.mode)
  q.set('date', params.date)
  const people = [...params.profileIds.map(id => `p:${id}`), ...params.studentIds.map(id => `s:${id}`)]
  if (people.length) q.set('people', people.join(','))
  if (params.types.length) q.set('types', params.types.join(','))
  if (params.roomIds.length) q.set('rooms', params.roomIds.join(','))
  if (params.status) q.set('status', params.status)
  return q.toString()
}

/** Inclusive date range (YYYY-MM-DD) the calendar shows for a mode, in the business timezone. */
export function visibleRange(date: string, mode: SchedulerMode): { from: string; to: string } {
  const [y, m, d] = date.split('-').map(Number)
  const anchor = new TZDate(y, m - 1, d, SCHEDULER_TIMEZONE)
  const fmt = (value: Date) => format(value, 'yyyy-MM-dd')

  if (mode === 'day') return { from: fmt(anchor), to: fmt(anchor) }
  if (mode === 'month') {
    const gridStart = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 })
    const gridEnd = addDays(startOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }), 6)
    return { from: fmt(gridStart), to: fmt(gridEnd) }
  }
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 })
  return { from: fmt(weekStart), to: fmt(addDays(weekStart, 6)) }
}

export function fullCalendarViewType(params: SchedulerParams): string {
  if (params.view === 'rooms') return params.mode === 'day' ? 'resourceTimeGridDay' : 'resourceTimeGridWeek'
  if (params.mode === 'day') return 'timeGridDay'
  if (params.mode === 'month') return 'dayGridMonth'
  return 'timeGridWeek'
}
