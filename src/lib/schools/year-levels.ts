/**
 * Year-level parsing and ordering for school fee bands.
 *
 * Fee bands are stored against a free-text description ("Year 12", "Y9",
 * "Year 9-13"). The export renders them as an ordered range ("Year 9 - Year 13")
 * and the schools list filters on the cheapest band, so both need a real
 * ordering — a string sort puts "Year 10" before "Year 9".
 *
 * Shared by the backfill script and the app so there is one definition.
 */

/** Ordered from youngest to oldest. Index is the sort key. */
export const YEAR_LEVELS = [
  'Nursery',
  'Reception',
  'Year 1',
  'Year 2',
  'Year 3',
  'Year 4',
  'Year 5',
  'Year 6',
  'Year 7',
  'Year 8',
  'Year 9',
  'Year 10',
  'Year 11',
  'Year 12',
  'Year 13',
  'Year 14',
] as const

export type YearLevel = (typeof YEAR_LEVELS)[number]

const YEAR_LEVEL_INDEX = new Map<string, number>(YEAR_LEVELS.map((l, i) => [l, i]))

/** Highest numbered year we treat as a year level; above this it is a course length. */
const MAX_YEAR = 14

export interface YearLevelRange {
  from: YearLevel
  to: YearLevel
}

/** Position in YEAR_LEVELS, or null if not a recognised year level. */
export function yearLevelIndex(level: string | null): number | null {
  if (!level) return null
  return YEAR_LEVEL_INDEX.get(level) ?? null
}

/** Sort comparator for year levels. Unknown values sort last. */
export function compareYearLevel(a: string | null, b: string | null): number {
  const ai = a ? (YEAR_LEVEL_INDEX.get(a) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER
  const bi = b ? (YEAR_LEVEL_INDEX.get(b) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER
  return ai - bi
}

const toYearLevel = (n: number): YearLevel | null =>
  n >= 1 && n <= MAX_YEAR ? (`Year ${n}` as YearLevel) : null

/**
 * Resolve a fee description to a year-level range.
 *
 * Returns null for descriptions that are not year levels at all — course
 * programmes ("1 Year AL", "Foundation", "English Course") and the catch-all
 * "Others". Those are real fees but not year-banded, so the export omits them
 * rather than guessing a band for them.
 *
 * Grade N and Form N are also left unresolved: mapping them onto UK year levels
 * is a judgement call about a handful of overseas schools, not a parse.
 */
export function parseYearLevelRange(description: string | null): YearLevelRange | null {
  if (!description) return null

  const text = description.trim().replace(/\s+/g, ' ')
  if (!text) return null

  // "Year 9-13", "Year 9 - Year 13"
  const range = text.match(/^year\s*(\d{1,2})\s*[-–]\s*(?:year\s*)?(\d{1,2})$/i)
  if (range) {
    const from = toYearLevel(parseInt(range[1], 10))
    const to = toYearLevel(parseInt(range[2], 10))
    if (from && to && compareYearLevel(from, to) <= 0) return { from, to }
    return null
  }

  // "Year 12", "Y9", "year 10", "Year 11 IGCSE", "Yera 12" (a real typo in the data)
  const single = text.match(/^y(?:ear|era)?\s*(\d{1,2})\b(.*)$/i)
  if (single) {
    // "Year 1 Year GCSE" and "Year 1 Year AL" are one-year courses, not Year 1.
    if (/\byear\b/i.test(single[2])) return null
    // "Year 18 months AL" — 18 is a duration, caught by the MAX_YEAR bound.
    const level = toYearLevel(parseInt(single[1], 10))
    if (level) return { from: level, to: level }
  }

  return null
}
