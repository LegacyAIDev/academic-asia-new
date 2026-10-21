/**
 * Formatting shared by the student's application list and the application page.
 * Free of React and of the database client, so it works on both sides of the
 * server/client boundary and can be unit-tested.
 */

import { TZDate } from '@date-fns/tz'
import { format } from 'date-fns'
import { SCHEDULER_TIMEZONE } from '@/lib/scheduler/config'

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Badge colours keyed by the category column of application_statuses. */
export const statusCategoryStyles: Record<string, string> = {
  awaiting: 'bg-amber-50 text-amber-700 border-amber-200',
  offered: 'bg-blue-50 text-blue-700 border-blue-200',
  deposited: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  waiting: 'bg-orange-50 text-orange-700 border-orange-200',
  positive: 'bg-green-50 text-green-700 border-green-200',
  negative: 'bg-rose-50 text-rose-700 border-rose-200',
  unavailable: 'bg-slate-100 text-slate-600 border-slate-200',
  other: 'bg-violet-50 text-violet-700 border-violet-200',
}

/** Badge colour for a status category; unknown or missing categories look like "other". */
export function statusStyle(category: string | null | undefined): string {
  return statusCategoryStyles[category ?? 'other'] ?? statusCategoryStyles.other
}

/** "Sep-2027" as the old system wrote entry and course start dates; a dash when neither part is set. */
export function monthYearLabel(month: number | null, year: number | null): string {
  if (!month && !year) return '—'
  return [month ? MONTH_NAMES[month] ?? '' : '', year ?? ''].filter(Boolean).join('-')
}

/**
 * "12 Oct 2026" for a date column. Read in UTC because a bare date parses as
 * UTC midnight, and the server and the browser must print the same day.
 */
export function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/** "14:30" from a time column ("14:30:00"); a dash when empty. */
export function formatTime(value: string | null): string {
  if (!value) return '—'
  return value.slice(0, 5)
}

/** Amount with thousands separators, as entered (no currency is stored with it). */
export function formatMoney(value: number | null): string {
  if (value == null) return '—'
  return value.toLocaleString('en-GB')
}

/** Age in whole years on the given day, or null without a usable date of birth. */
export function ageInYears(dateOfBirth: string | null, today: Date = new Date()): number | null {
  if (!dateOfBirth) return null
  const born = new Date(dateOfBirth)
  if (Number.isNaN(born.getTime())) return null
  let age = today.getUTCFullYear() - born.getUTCFullYear()
  const beforeBirthday =
    today.getUTCMonth() < born.getUTCMonth() ||
    (today.getUTCMonth() === born.getUTCMonth() && today.getUTCDate() < born.getUTCDate())
  if (beforeBirthday) age -= 1
  return age >= 0 ? age : null
}

/** "21 Oct 2026" for a timestamp, on the Hong Kong calendar day like bookings and status changes. */
export function formatHkDay(iso: string): string {
  return format(new TZDate(iso, SCHEDULER_TIMEZONE), 'd MMM yyyy')
}
