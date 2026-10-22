/**
 * Names and match keys for the list of present schools (the school a student
 * attends now, not the UK schools they apply to).
 *
 * Staff typed the current school freely for years, so one school appears as
 * "ST. PAUL'S COLLEGE", "ST PAUL'S COLLEGE" and "St Paul’s College". The match
 * key ignores exactly those differences — case, dots, commas, apostrophes
 * (straight or curly), repeated spaces and a leading "THE" — and nothing more,
 * so two schools that differ in a word never share a key.
 *
 * Shared by the import script, the school picker and the add-school action, so
 * a spelling found on import is the same spelling found when staff search.
 */

const CURLY_APOSTROPHES = /[\u2018\u2019\u02BC]/g

/** Longest name staff may add; the longest name on the list is under 200 characters. */
export const PRESENT_SCHOOL_NAME_MAX = 200

/**
 * Trimmed, single-spaced and upper case, the way names appear in the list.
 * NFC first, because text pasted on a Mac can spell "Õ" as two characters.
 */
export function cleanSchoolName(input: string): string {
  return input.normalize('NFC').replace(CURLY_APOSTROPHES, "'").replace(/\s+/g, ' ').trim().toUpperCase()
}

export function presentSchoolKey(name: string): string {
  return cleanSchoolName(name)
    .replace(/[.,']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^THE /, '')
}

/**
 * One line of the Hong Kong list file. 234 lines hold two spellings of the same
 * school as "A / B"; the first becomes the name and the rest alternative
 * spellings. The file starts with a byte order mark and uses CRLF line ends.
 */
export function parseSchoolListLine(line: string): { name: string; aliases: string[] } | null {
  const [name, ...aliases] = line
    .replace(/^\uFEFF/, '')
    .split(/\s+\/\s+/)
    .map(cleanSchoolName)
    .filter(Boolean)
  return name ? { name, aliases } : null
}

/** A name worth saving holds a letter or digit: the old data used "-" and "N/A" style placeholders. */
export function isUsableSchoolName(name: string): boolean {
  return /[\p{L}\p{N}]/u.test(presentSchoolKey(name))
}

/** Every key a school can be found by, each once: its name's key first. */
export function schoolSearchKeys(name: string, aliases: string[]): string[] {
  return [...new Set([name, ...aliases].map(presentSchoolKey).filter(Boolean))]
}

/**
 * Other spellings as staff type them (one per line): cleaned like names, with
 * blanks, repeats and anything that is only the name again dropped by key.
 */
export function cleanOtherSpellings(name: string, spellings: string[]): string[] {
  const seen = new Set([presentSchoolKey(name)])
  const kept: string[] = []
  for (const spelling of spellings.map(cleanSchoolName)) {
    const key = presentSchoolKey(spelling)
    if (!key || seen.has(key)) continue
    seen.add(key)
    kept.push(spelling)
  }
  return kept
}

/** Where a school came from: the imported Hong Kong list, or added by staff. */
export type PresentSchoolSource = 'hk_list' | 'staff'

/** A school as the student form's picker needs it. */
export type PresentSchoolOption = { id: number; name: string; aliases: string[] }

export type IndexedPresentSchool<T extends PresentSchoolOption = PresentSchoolOption> = { school: T; keys: string[] }

/** Keys worked out once per list, so filtering on each keystroke only compares strings. */
export function indexPresentSchools<T extends PresentSchoolOption>(schools: T[]): IndexedPresentSchool<T>[] {
  return schools.map((school) => ({ school, keys: schoolSearchKeys(school.name, school.aliases) }))
}

/**
 * Schools matching what staff typed, best first: the school spelled exactly so,
 * then spellings that start with the query, then ones containing it, then ones
 * holding every typed word ("harrow secondary" finds "HARROW INTERNATIONAL
 * SCHOOL HONG KONG (SECONDARY)"). Within a rank the list keeps its name order.
 * `exact` is the school one of whose spellings is the query; without one the
 * picker offers to add what was typed as a new school. `total` counts every
 * match, `matches` holds at most `limit` of them.
 */
export function filterPresentSchools<T extends PresentSchoolOption>(index: IndexedPresentSchool<T>[], query: string, limit = 50) {
  const q = presentSchoolKey(query)
  if (!q) {
    return { matches: index.slice(0, limit).map((e) => e.school), more: index.length > limit, total: index.length, exact: null }
  }

  const words = q.split(' ')
  const ranked: { school: T; rank: number }[] = []
  for (const { school, keys } of index) {
    const rank = keys.includes(q) ? 0
      : keys.some((k) => k.startsWith(q)) ? 1
      : keys.some((k) => k.includes(q)) ? 2
      : keys.some((k) => words.every((w) => k.includes(w))) ? 3
      : -1
    if (rank >= 0) ranked.push({ school, rank })
  }
  ranked.sort((a, b) => a.rank - b.rank)

  return {
    matches: ranked.slice(0, limit).map((r) => r.school),
    more: ranked.length > limit,
    total: ranked.length,
    exact: ranked[0]?.rank === 0 ? ranked[0].school : null,
  }
}

/**
 * Schools under their first letter, A to Z, for the directory view. Accents
 * count as their letter (É under E); names starting with anything else go
 * under "#", last. Within a letter the given order (by name) is kept.
 */
export function groupByInitial<T extends { name: string }>(schools: T[]): { letter: string; schools: T[] }[] {
  const groups = new Map<string, T[]>()
  for (const school of schools) {
    const first = school.name.trim().normalize('NFD').charAt(0).toUpperCase()
    const letter = /[A-Z]/.test(first) ? first : '#'
    const group = groups.get(letter) ?? []
    group.push(school)
    groups.set(letter, group)
  }
  return [...groups]
    .sort(([a], [b]) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)))
    .map(([letter, list]) => ({ letter, schools: list }))
}
