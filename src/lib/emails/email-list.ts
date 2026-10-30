import type { EmailDirection } from './email-form'
import type { FiledEmailSummary } from './filed-email'
import { hkDay } from '@/lib/hk-day'

/**
 * Search, filters and sorting for the Communications list (WEB-01). The list
 * is loaded once per page and filtered in the browser: a record rarely has
 * more than a few hundred emails, so this keeps every keystroke instant.
 */

export type EmailSortKey = 'sentAt' | 'subject' | 'from' | 'createdAt'
export type SortDirection = 'asc' | 'desc'

export type EmailListFilters = {
  query: string
  direction: EmailDirection | 'all'
  /** Hong Kong calendar days, "YYYY-MM-DD"; empty for no limit. */
  fromDay: string
  toDay: string
  applicationId: string | 'all'
  showArchived: boolean
}

export const EMPTY_FILTERS: EmailListFilters = {
  query: '', direction: 'all', fromDay: '', toDay: '', applicationId: 'all', showArchived: false,
}

export const EMAIL_PAGE_SIZE = 50

/** True when anything differs from the defaults, for the "Clear filters" button. */
export function hasActiveFilters(f: EmailListFilters): boolean {
  return f.query.trim() !== '' || f.direction !== 'all' || f.fromDay !== '' || f.toDay !== ''
    || f.applicationId !== 'all' || f.showArchived
}

export { hkDay } from '@/lib/hk-day'

function haystack(e: FiledEmailSummary): string {
  return [
    e.subject, e.from, ...e.to, ...e.cc, e.preview, e.staffNote ?? '',
    ...e.attachments.map(a => a.name), e.application?.label ?? '', e.student?.name ?? '', e.school?.name ?? '',
  ].join('\n').toLowerCase()
}

/**
 * `bodyMatches` holds ids the server found by searching the full email text,
 * which the list itself does not carry; an email matches the words if either
 * its listed fields or its full text contain them all.
 */
export function filterEmails(
  list: FiledEmailSummary[],
  f: EmailListFilters,
  bodyMatches: ReadonlySet<string> = new Set(),
): FiledEmailSummary[] {
  const words = f.query.toLowerCase().split(/\s+/).filter(Boolean)
  return list.filter(e => {
    if (!f.showArchived && e.archivedAt) return false
    if (f.direction !== 'all' && e.direction !== f.direction) return false
    if (f.applicationId !== 'all' && e.application?.id !== f.applicationId) return false
    const day = hkDay(e.sentAt)
    if (f.fromDay && day < f.fromDay) return false
    if (f.toDay && day > f.toDay) return false
    if (words.length === 0) return true
    if (bodyMatches.has(e.id)) return true
    const text = haystack(e)
    return words.every(w => text.includes(w))
  })
}

const VALUE: Record<EmailSortKey, (e: FiledEmailSummary) => string> = {
  sentAt: e => e.sentAt,
  createdAt: e => e.createdAt,
  subject: e => e.subject.toLowerCase(),
  from: e => e.from.toLowerCase(),
}

/** Sorted copy; ties fall back to newest first so the order never jumps between renders. */
export function sortEmails(list: FiledEmailSummary[], key: EmailSortKey, dir: SortDirection): FiledEmailSummary[] {
  const value = VALUE[key]
  const sign = dir === 'asc' ? 1 : -1
  return [...list].sort((a, b) => {
    const diff = value(a).localeCompare(value(b))
    if (diff !== 0) return diff * sign
    return b.sentAt.localeCompare(a.sentAt) || b.id.localeCompare(a.id)
  })
}

/** Clicking a heading: a new column starts with its natural order, the same column flips. */
export function nextEmailSort(current: { key: EmailSortKey; dir: SortDirection }, key: EmailSortKey) {
  if (current.key !== key) return { key, dir: key === 'sentAt' || key === 'createdAt' ? 'desc' : 'asc' } as const
  return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } as const
}
