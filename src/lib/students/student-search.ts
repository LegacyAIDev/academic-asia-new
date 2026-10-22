/**
 * The words of a student search, as the server filters them: every word has to
 * appear in the surname, first name, Chinese name or student code, so
 * "chan tai man" and "tai man chan" both find CHAN Tai Man.
 *
 * Characters that the API's filter syntax uses (commas, brackets, quotes,
 * wildcards, dots, colons) are dropped rather than escaped; names do not need
 * them to be found. At most four words of 40 characters, to keep the filter short.
 */
export function studentSearchWords(query: string): string[] {
  return query
    .replace(/[%*,()"'\\.:]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .map((word) => word.slice(0, 40))
}

/** The filter for one word, matched anywhere in any of the searchable columns. */
export function studentSearchFilter(word: string): string {
  return ['surname', 'first_name', 'chinese_name', 'student_code'].map((column) => `${column}.ilike.%${word}%`).join(',')
}
