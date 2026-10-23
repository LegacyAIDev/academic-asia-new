import { TZDate } from '@date-fns/tz'
import { format, formatDistanceStrict } from 'date-fns'
import { z } from 'zod'
import { SCHEDULER_TIMEZONE } from '@/lib/scheduler/config'

export const NOTE_MAX_LENGTH = 5000

/** Same limits as the database check, so a too-long note fails with words rather than a constraint error. */
export const noteBodySchema = z
  .string()
  .trim()
  .min(1, 'Write a note first')
  .max(NOTE_MAX_LENGTH, `Notes can be up to ${NOTE_MAX_LENGTH.toLocaleString('en-GB')} characters`)

const DAY_MS = 24 * 60 * 60 * 1000
const EDITED_AFTER_MS = 60 * 1000

/**
 * "3 hours ago" for the last week, then "14 Oct 2026, 09:30" in Hong Kong time,
 * where the office works. Older notes need the exact day to be useful.
 */
export function formatNoteDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  const age = Math.abs(now.getTime() - date.getTime())
  if (age < 60 * 1000) return 'Just now'
  if (age < 7 * DAY_MS) return formatDistanceStrict(date, now, { addSuffix: true })
  return format(new TZDate(date, SCHEDULER_TIMEZONE), 'd MMM yyyy, HH:mm')
}

/** Full timestamp for the tooltip of a relative date. */
export function formatNoteTimestamp(iso: string): string {
  return format(new TZDate(new Date(iso), SCHEDULER_TIMEZONE), 'd MMM yyyy, HH:mm:ss')
}

/** A note counts as edited when it changed more than a minute after it was written. */
export function isEdited(createdAt: string, updatedAt: string): boolean {
  return new Date(updatedAt).getTime() - new Date(createdAt).getTime() > EDITED_AFTER_MS
}

/**
 * "Author · date" under a school note. Imported notes carry the old system's
 * date and read "Old system · 3 Mar 2024". A note written here without a known
 * author (before authors were recorded, or by an account since removed) shows
 * only its date rather than guessing a name.
 */
export function schoolNoteByline(note: {
  authorName: string | null
  createdBy: string | null
  createdAt: string | null
  legacyLastUpdate: string | null
}): string | null {
  if (!note.createdBy && note.legacyLastUpdate) {
    return `Old system · ${format(new TZDate(new Date(note.legacyLastUpdate), SCHEDULER_TIMEZONE), 'd MMM yyyy')}`
  }
  const who = note.createdBy ? (note.authorName ?? 'Former staff') : null
  const when = note.createdAt ? formatNoteDate(note.createdAt) : null
  return [who, when].filter(Boolean).join(' · ') || null
}
