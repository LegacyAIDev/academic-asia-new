/**
 * Shared upload constraints for every document and attachment path.
 *
 * Previously duplicated in student-documents.ts and school-documents.ts; a third
 * copy for record attachments would have guaranteed the three drifted apart.
 */

export const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

export const MAX_BYTES = 10 * 1024 * 1024

/** Human-readable size, used in upload lists and attachment rows. */
export function formatFileSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

/**
 * Only http(s) links are storable.
 *
 * An attachment URL is rendered as a clickable anchor for staff, so accepting
 * javascript:, data: or file: would turn a text field into a script injection
 * and a local-file read. Checked server-side on write and again at render, since
 * rows could predate this rule.
 */
export function isSafeExternalUrl(raw: string): boolean {
  try {
    const url = new URL(raw.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/** Hostname for display, falling back to the raw string if it will not parse. */
export function urlHostname(raw: string): string {
  try {
    return new URL(raw.trim()).hostname.replace(/^www\./, '')
  } catch {
    return raw
  }
}
