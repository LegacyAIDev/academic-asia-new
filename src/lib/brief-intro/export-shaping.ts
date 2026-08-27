/**
 * Pure shaping for the Brief Introduction export. No Supabase, no I/O — given
 * the same rows it always produces the same values, so the awkward cases can be
 * tested directly.
 *
 * Two of these decide whether the export is honest rather than merely pretty:
 *
 *   1. Spoken English lives in two places. Records migrated from the legacy
 *      system carry free text in `legacy_spoken_english`; records written since
 *      carry a foreign key to `spoken_english_levels`. Reading only the join
 *      blanks the field for every migrated student, which is most of them.
 *
 *   2. `remarks` is EITHER sanitized HTML (from the rich text editor) OR plain
 *      text (from the migration). The PDF can render the HTML as-is, but a
 *      spreadsheet cell cannot — it would show the tags. htmlToPlainText is the
 *      bridge, and it has to survive markup written years ago by another system.
 */

import sanitizeHtml from 'sanitize-html'
import { looksLikeHtml } from '@/lib/utils'

/** Excel refuses any cell over 32,767 characters. Leave room for the marker. */
const MAX_CELL_LENGTH = 32_000

export function profileName(
  profile: { first_name: string | null; surname: string | null } | null
): string | null {
  if (!profile) return null
  return [profile.first_name, profile.surname].filter(Boolean).join(' ') || null
}

/** "Surname, First" so an alphabetical sort matches how staff read a class list. */
export function studentSortName(firstName: string | null, surname: string | null): string {
  const first = (firstName ?? '').trim()
  const last = (surname ?? '').trim()
  if (last && first) return `${last}, ${first}`
  return last || first || 'Unnamed student'
}

/** Joined label first, then the migrated free text, then an em dash. */
export function resolveSpokenEnglish(
  level: { label: string } | null,
  legacy: string | null
): string {
  return level?.label?.trim() || legacy?.trim() || '—'
}

/** Print format used across the app, e.g. "27 Aug 2026". */
export function formatExportDate(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Flatten stored remarks to readable plain text for a spreadsheet cell.
 *
 * Block boundaries are turned into newlines before the tags are stripped —
 * strip first and three paragraphs run together into one unreadable sentence.
 * Tag removal itself goes through sanitize-html rather than a regex: the input
 * includes markup from the legacy system, and a regex that is wrong about
 * nesting or attributes leaks tag text into the cell.
 */
export function htmlToPlainText(value: string | null): string {
  if (!value) return ''
  if (!looksLikeHtml(value)) return value.trim()

  const withBreaks = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|blockquote|tr)>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')

  const stripped = sanitizeHtml(withBreaks, {
    allowedTags: [],
    allowedAttributes: {},
    // Script and style hold text that is not content; dropping the tag alone
    // would spill the stylesheet into the cell.
    nonTextTags: ['style', 'script', 'textarea', 'option', 'noscript'],
  })

  return decodeEntities(stripped)
    .replace(/\r\n/g, '\n')
    // Non-breaking spaces arrive as literal U+00A0 rather than as the entity.
    // Left alone they are invisible in the cell but break Excel lookups and
    // filters, which is a miserable thing to debug from a spreadsheet.
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** sanitize-html re-encodes as it strips, so the entities come back escaped. */
function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    // Ampersand last, or "&amp;lt;" decodes twice into a tag.
    .replace(/&amp;/g, '&')
}

/** Keep a cell inside Excel's hard limit, marking where the text was cut. */
export function truncateForCell(value: string, max = MAX_CELL_LENGTH): string {
  if (value.length <= max) return value
  return `${value.slice(0, max - 1)}…`
}

/**
 * Normalise a free-text value for a spreadsheet cell.
 *
 * Deliberately does NOT escape leading = + - @ against formula injection, which
 * is the reflex here. That mitigation belongs to CSV. This export is .xlsx, and
 * a string written through ExcelJS lands as a String cell (ValueType 3) with no
 * formula attached — "=1+1" is inert on open, verified by round-tripping the
 * generated file in the tests.
 *
 * Prefixing an apostrophe would be worse than useless: ExcelJS stores it as a
 * literal character rather than as the OOXML quotePrefix style (which it drops
 * entirely), so it would show up in the cell and corrupt every hobbies field a
 * consultant began with a dash.
 *
 * If a CSV export is ever added, escape there — at the point where the format
 * actually evaluates cell text.
 */
export function toCellText(value: string | null): string {
  return truncateForCell((value ?? '').trim())
}

/**
 * Real Date for a spreadsheet cell, or null to leave it empty. A column of
 * date-shaped *text* sorts lexicographically, putting 1 February ahead of
 * 2 January, so the conversion matters more than the display format.
 */
export function toCellDate(value: string | null): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Filename for the download, e.g.
 * brief-introduction-chan-charlotte-2026-08-27.pdf, or the plural form with a
 * count once more than one student is included.
 */
export function exportFilename(
  payload: { rows: { studentName: string }[]; generatedOn: string },
  extension: string
): string {
  const date = payload.generatedOn.slice(0, 10)

  if (payload.rows.length === 1) {
    return `brief-introduction-${slugify(payload.rows[0].studentName)}-${date}.${extension}`
  }
  return `brief-introductions-${payload.rows.length}-students-${date}.${extension}`
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize('NFD')
      // Strip accents so a name never produces an unreadable percent-encoded file.
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'student'
  )
}
