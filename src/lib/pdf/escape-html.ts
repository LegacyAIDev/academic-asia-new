/**
 * Makes a piece of text safe to place inside HTML that is built as a string,
 * both between tags and inside a quoted attribute. The PDF documents are
 * assembled this way, and what goes into them is typed by staff.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
