/**
 * Links within the students list. Every link keeps the filters in use and
 * changes only what it is about; changing anything but the page goes back to
 * page 1, since the old page number means nothing under a new filter or order.
 */
export function studentsListHref(
  current: Record<string, string | undefined>,
  changes: Record<string, string | null>,
  base = '/students',
): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(current)) if (value) params.set(key, value)
  if (!('page' in changes)) params.delete('page')
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === '') params.delete(key)
    else params.set(key, value)
  }
  if (params.get('page') === '1') params.delete('page')
  const query = params.toString()
  return query ? `${base}?${query}` : base
}

export const PAGE_SIZES = [25, 50, 100] as const

/** Rows per page from the URL; anything but an offered size falls back to 25. */
export function pageSizeFrom(value: string | undefined): number {
  const n = Number(value)
  return (PAGE_SIZES as readonly number[]).includes(n) ? n : PAGE_SIZES[0]
}

/**
 * Page numbers to offer: first, last, and two either side of the current page,
 * with null where a run is skipped (1 … 4 5 6 7 8 … 40).
 */
export function pageWindow(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const from = Math.max(2, Math.min(current - 2, total - 5))
  const to = Math.min(total - 1, Math.max(current + 2, 6))
  const pages: (number | null)[] = [1]
  if (from > 2) pages.push(null)
  for (let p = from; p <= to; p++) pages.push(p)
  if (to < total - 1) pages.push(null)
  pages.push(total)
  return pages
}
