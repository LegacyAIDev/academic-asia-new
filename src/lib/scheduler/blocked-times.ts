import { TZDate } from '@date-fns/tz'
import { addDays } from 'date-fns'
import { z } from 'zod'
import { SCHEDULER_TIMEZONE } from './config'
import { overlaps } from './conflicts'

/**
 * Pure rules for recurring blocked times (lunch, a room held back every
 * Friday, ...): the repeat presets, validation shared by the form and the
 * server action, the one-line summary, and clash detection against bookings.
 * Weekdays are ISO numbers everywhere: 1 = Monday ... 7 = Sunday.
 */

export const BLOCK_PRESETS = {
  every_day: [1, 2, 3, 4, 5, 6, 7],
  weekdays: [1, 2, 3, 4, 5],
} as const

export type BlockPreset = 'every_day' | 'weekdays' | 'pick' | 'once'

export const PRESET_LABELS: Record<BlockPreset, string> = {
  every_day: 'Every day',
  weekdays: 'Mon–Fri',
  pick: 'Pick days',
  once: 'Just once',
}

export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** A stored block, as the lists and the editing form need it. */
export type BlockedTime = {
  id: string
  label: string
  profile_id: string | null
  room_id: string | null
  weekdays: number[]
  start_time: string
  end_time: string
  starts_on: string
  ends_on: string | null
}

/** One dated occurrence of a block, expanded by the database. */
export type BlockedOccurrence = {
  blockedTimeId: string
  label: string
  profileId: string | null
  roomId: string | null
  startAt: string
  endAt: string
}

/** A booking that overlaps a block. */
export type BlockClash = { bookingId: string | null; title: string; startAt: string; endAt: string }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

/** ISO weekday (1 = Monday ... 7 = Sunday) of a YYYY-MM-DD date. */
export function isoWeekday(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return day === 0 ? 7 : day
}

function sameDays(a: readonly number[], b: readonly number[]): boolean {
  const sortedB = [...b].sort((x, y) => x - y)
  return a.length === b.length && [...a].sort((x, y) => x - y).every((day, index) => day === sortedB[index])
}

/** Which repeat preset a stored block corresponds to, so editing reopens it the way it was made. */
export function presetFor(weekdays: number[], startsOn: string, endsOn: string | null): BlockPreset {
  if (endsOn && endsOn === startsOn && weekdays.length === 1 && weekdays[0] === isoWeekday(startsOn)) return 'once'
  if (sameDays(weekdays, BLOCK_PRESETS.every_day)) return 'every_day'
  if (sameDays(weekdays, BLOCK_PRESETS.weekdays)) return 'weekdays'
  return 'pick'
}

/** A day that exists: the format alone would let 2026-02-31 through to the database. */
function isRealDate(value: string): boolean {
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

const dateField = z.string().regex(DATE_RE, 'Pick a date').refine(isRealDate, 'Pick a date')
const timeField = z.string().regex(TIME_RE, 'Pick a time')

/** A block whose last day is before `today` (YYYY-MM-DD in the business time zone). */
export function hasEnded(block: Pick<BlockedTime, 'ends_on'>, today: string): boolean {
  return block.ends_on !== null && block.ends_on < today
}

/**
 * The form values and the server action input. "Just once" ignores the picked
 * days and the end date: it becomes the weekday of the start date, ending the
 * same day, which is how the database stores a one-off block.
 */
export const blockedTimeSchema = z
  .object({
    label: z.string().trim().min(1, 'Give the block a name').max(80, 'Keep the name under 80 characters'),
    preset: z.enum(['every_day', 'weekdays', 'pick', 'once']),
    weekdays: z.array(z.number().int().min(1).max(7)).default([]),
    start_time: timeField,
    end_time: timeField,
    starts_on: dateField,
    ends_on: dateField.nullable().default(null),
  })
  .superRefine((value, ctx) => {
    if (value.preset === 'pick' && value.weekdays.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['weekdays'], message: 'Pick at least one day' })
    }
    // Compare only well-formed times, so a bad time reports one error, not two.
    if (TIME_RE.test(value.start_time) && TIME_RE.test(value.end_time) && value.end_time <= value.start_time) {
      ctx.addIssue({ code: 'custom', path: ['end_time'], message: 'End time must be after the start time' })
    }
    if (value.preset !== 'once' && value.ends_on && value.ends_on < value.starts_on) {
      ctx.addIssue({ code: 'custom', path: ['ends_on'], message: 'The end date can’t be before the start date' })
    }
  })
  .transform(value => {
    const once = value.preset === 'once'
    let weekdays: number[]
    if (value.preset === 'pick') weekdays = [...new Set(value.weekdays)].sort((a, b) => a - b)
    else if (value.preset === 'once') weekdays = [isoWeekday(value.starts_on)]
    else weekdays = [...BLOCK_PRESETS[value.preset]]
    return {
      label: value.label,
      weekdays,
      start_time: value.start_time,
      end_time: value.end_time,
      starts_on: value.starts_on,
      ends_on: once ? value.starts_on : value.ends_on,
    }
  })

export type BlockedTimeInput = z.input<typeof blockedTimeSchema>
export type BlockedTimeValues = z.output<typeof blockedTimeSchema>

/** Form values for an existing block. */
export function toBlockedTimeInput(block: BlockedTime): BlockedTimeInput {
  return {
    label: block.label,
    preset: presetFor(block.weekdays, block.starts_on, block.ends_on),
    weekdays: block.weekdays,
    start_time: shortTime(block.start_time),
    end_time: shortTime(block.end_time),
    starts_on: block.starts_on,
    ends_on: block.ends_on,
  }
}

/** The database returns times as "13:00:00". */
export function shortTime(time: string): string {
  return time.slice(0, 5)
}

function formatDate(date: string, withWeekday = false): string {
  const [y, m, d] = date.split('-').map(Number)
  const text = `${d} ${MONTH_SHORT[m - 1]} ${y}`
  return withWeekday ? `${WEEKDAY_SHORT[isoWeekday(date) - 1]} ${text}` : text
}

function describeDays(weekdays: number[]): string {
  if (sameDays(weekdays, BLOCK_PRESETS.every_day)) return 'Every day'
  if (sameDays(weekdays, BLOCK_PRESETS.weekdays)) return 'Mon–Fri'
  return [...weekdays].sort((a, b) => a - b).map(day => WEEKDAY_SHORT[day - 1]).join(', ')
}

/** "Mon–Fri · 13:00–14:00 · from 3 Nov 2026", or "Tue 3 Nov 2026 · 13:00–14:00" for a one-off. */
export function describeBlockedTime(
  block: Pick<BlockedTime, 'weekdays' | 'start_time' | 'end_time' | 'starts_on' | 'ends_on'>,
): string {
  const times = `${shortTime(block.start_time)}–${shortTime(block.end_time)}`
  if (presetFor(block.weekdays, block.starts_on, block.ends_on) === 'once') {
    return `${formatDate(block.starts_on, true)} · ${times}`
  }
  const span = block.ends_on
    ? `${formatDate(block.starts_on)} to ${formatDate(block.ends_on)}`
    : `from ${formatDate(block.starts_on)}`
  return `${describeDays(block.weekdays)} · ${times} · ${span}`
}

/** Bookings that overlap any occurrence, each listed once. Touching edges do not clash. */
export function findBlockClashes<T extends { startAt: string; endAt: string }>(
  occurrences: { startAt: string; endAt: string }[],
  items: T[],
): T[] {
  return items.filter(item => occurrences.some(o => overlaps(item.startAt, item.endAt, o.startAt, o.endAt)))
}

/** Inclusive business-day dates as the instants [from 00:00, day after `to` 00:00) in Hong Kong. */
export function hkDateRangeToInstants(from: string, to: string): { from: string; to: string } {
  const start = (date: string) => {
    const [y, m, d] = date.split('-').map(Number)
    return new TZDate(y, m - 1, d, SCHEDULER_TIMEZONE)
  }
  return {
    from: new Date(start(from).getTime()).toISOString(),
    to: new Date(addDays(start(to), 1).getTime()).toISOString(),
  }
}
