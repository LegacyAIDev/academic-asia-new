/**
 * Calendar dates with no time of day (date of birth, registration date).
 *
 * Date pickers hand back local midnight. Converting that with toISOString()
 * moves it to UTC, which in Hong Kong (UTC+8) is the day before; reading the
 * saved value back and saving again shifted it one more day each time
 * (UAT DEV24-001). Both directions here use local calendar fields only.
 */

/** "YYYY-MM-DD" of the calendar day shown in a date picker. */
export function toDateOnly(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Local-midnight Date for a stored "YYYY-MM-DD", for date pickers; undefined when blank or malformed. */
export function parseDateOnly(value: string | null | undefined): Date | undefined {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null
  if (!match) return undefined
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return toDateOnly(date) === value ? date : undefined
}
