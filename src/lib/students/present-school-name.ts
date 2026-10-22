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

/** Every key a school can be found by, each once: its name's key first. */
export function schoolSearchKeys(name: string, aliases: string[]): string[] {
  return [...new Set([name, ...aliases].map(presentSchoolKey).filter(Boolean))]
}
