import { TZDate } from '@date-fns/tz'
import { SCHEDULER_TIMEZONE, SLOT_MINUTES } from './config'

/**
 * Pure HK wall-clock <-> ISO instant conversions shared by the booking dialog.
 * The form keeps times as ISO strings with an offset; only the inputs the user
 * sees (date picker, time selects) work in Hong Kong local time.
 */

export type HkParts = { date: Date; time: string }

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}

/** Splits an ISO instant into a HK calendar date (local midnight) and an "HH:mm" time. */
export function toHkParts(iso: string): HkParts {
  const zoned = new TZDate(iso, SCHEDULER_TIMEZONE)
  return {
    date: new Date(zoned.getFullYear(), zoned.getMonth(), zoned.getDate()),
    time: `${pad(zoned.getHours())}:${pad(zoned.getMinutes())}`,
  }
}

/** Combines a HK calendar date and "HH:mm" time back into an ISO instant. */
export function fromHkParts(date: Date, time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const zoned = new TZDate(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, SCHEDULER_TIMEZONE)
  return new Date(zoned.getTime()).toISOString()
}

/** Rounds a moment up to the next 15-minute slot boundary, in HK wall-clock time. */
export function roundUpToSlot(date: Date): Date {
  const zoned = new TZDate(date, SCHEDULER_TIMEZONE)
  const remainder = zoned.getMinutes() % SLOT_MINUTES
  const add = remainder === 0 ? 0 : SLOT_MINUTES - remainder
  return new TZDate(
    zoned.getFullYear(),
    zoned.getMonth(),
    zoned.getDate(),
    zoned.getHours(),
    zoned.getMinutes() + add,
    0,
    SCHEDULER_TIMEZONE,
  )
}

/** DD/MM/YYYY, for read-only summaries. */
export function formatHkDate(iso: string): string {
  const zoned = new TZDate(iso, SCHEDULER_TIMEZONE)
  return `${pad(zoned.getDate())}/${pad(zoned.getMonth() + 1)}/${zoned.getFullYear()}`
}

/** HH:mm, for read-only summaries. */
export function formatHkTime(iso: string): string {
  const zoned = new TZDate(iso, SCHEDULER_TIMEZONE)
  return `${pad(zoned.getHours())}:${pad(zoned.getMinutes())}`
}

/** "HH:mm" options between two times, one per slot (default 15 minutes). */
export function buildTimeOptions(startTime = '07:00', endTime = '22:00', step = SLOT_MINUTES): string[] {
  const options: string[] = []
  let [hours, minutes] = startTime.split(':').map(Number)
  const [endHours, endMinutes] = endTime.split(':').map(Number)

  while (hours < endHours || (hours === endHours && minutes <= endMinutes)) {
    options.push(`${pad(hours)}:${pad(minutes)}`)
    minutes += step
    if (minutes >= 60) {
      minutes -= 60
      hours += 1
    }
  }
  return options
}
