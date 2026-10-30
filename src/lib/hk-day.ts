/**
 * Calendar days in Hong Kong, where the office works. Hong Kong has no
 * daylight saving, so a fixed +8 hours from UTC is exact all year.
 */

const HK_OFFSET_MS = 8 * 60 * 60 * 1000

/** "YYYY-MM-DD" of an instant on the Hong Kong calendar. */
export function hkDay(instant: string | Date): string {
  const ms = typeof instant === 'string' ? new Date(instant).getTime() : instant.getTime()
  return new Date(ms + HK_OFFSET_MS).toISOString().slice(0, 10)
}

/** Today's date in Hong Kong. */
export function hkToday(now: Date = new Date()): string {
  return hkDay(now)
}
