/**
 * The booking page can be opened with a `from` parameter so its back link
 * returns to where the user came from: the calendar with its exact view and
 * filters, the Exams page, or a student's page. Only these in-app paths are
 * accepted, which keeps the parameter from being used as an open redirect.
 */

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

const RETURN_TARGETS: { pattern: RegExp; label: string }[] = [
  { pattern: /^\/scheduler(?:[/?#]|$)/, label: 'Back to calendar' },
  { pattern: /^\/exams(?:[?#]|$)/, label: 'Back to exams' },
  { pattern: new RegExp(`^/students/${UUID}(?:[?#]|$)`, 'i'), label: 'Back to student' },
]

export function safeReturnPath(from: string | string[] | undefined, fallback: string): string {
  const value = Array.isArray(from) ? from[0] : from
  if (!value) return fallback
  if (value.includes('//') || value.includes('\\') || value.includes('://')) return fallback
  return RETURN_TARGETS.some(target => target.pattern.test(value)) ? value : fallback
}

/** Wording of the back link for a return path, e.g. "Back to exams". */
export function returnLabel(path: string): string {
  return RETURN_TARGETS.find(target => target.pattern.test(path))?.label ?? 'Back to calendar'
}

/** Link to a booking's own page that brings the user back to `returnTo` afterwards. */
export function bookingPageHref(bookingId: string, returnTo?: string): string {
  const base = `/scheduler/bookings/${bookingId}`
  return returnTo ? `${base}?from=${encodeURIComponent(returnTo)}` : base
}
