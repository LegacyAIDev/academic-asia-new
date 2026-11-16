/**
 * Pairs a school's courses with its entrance exams for the Courses tab: same
 * entry year and same year group. Entry years are stored as "2032-33", "2032–33"
 * or just "2032", so they are compared by their first year.
 */

/** The first year of an academic year ("2032-33", "2032–33", "2032" → 2032), or null. */
export function entryYearStart(value: string | null | undefined): number | null {
  const match = value?.match(/\b(19|20)\d{2}\b/)
  return match ? Number(match[0]) : null
}

/** How an entry year is shown: 2032 → "2032–33". */
export function entryYearLabel(start: number): string {
  return `${start}–${String(start + 1).slice(-2)}`
}

/** A year group as compared: "Year 9", "year 9 " and "Year  9" are the same. */
export function yearGroupKey(value: string | null | undefined): string | null {
  const key = value?.trim().toLowerCase().replace(/\s+/g, ' ')
  return key ? key : null
}

/** The entry years the courses cover, newest first. */
export function courseEntryYears(courses: { school_year: string | null }[]): number[] {
  const years = new Set<number>()
  for (const course of courses) {
    const start = entryYearStart(course.school_year)
    if (start !== null) years.add(start)
  }
  return [...years].sort((a, b) => b - a)
}

/**
 * The entry year to show first: the coming intake (this academic year's next
 * entry, as the forms default to) when courses exist for it, else the nearest
 * one ahead, else the newest.
 */
export function defaultEntryYear(years: number[], today: Date = new Date()): number | null {
  if (years.length === 0) return null
  const coming = today.getFullYear() + 1
  if (years.includes(coming)) return coming
  const ahead = years.filter(y => y >= coming).sort((a, b) => a - b)
  return ahead[0] ?? years[0]
}

/** The entrance exams for one course: the same entry year and year group, in subject order. */
export function examsForCourse<E extends { entry_year: string | null; year_level: string | null; subject: string | null }>(
  exams: E[],
  entryYear: number | null,
  yearGroup: string | null | undefined,
): E[] {
  const group = yearGroupKey(yearGroup)
  if (entryYear === null || group === null) return []
  return exams
    .filter(exam => entryYearStart(exam.entry_year) === entryYear && yearGroupKey(exam.year_level) === group)
    .sort((a, b) => (a.subject ?? '').localeCompare(b.subject ?? ''))
}
