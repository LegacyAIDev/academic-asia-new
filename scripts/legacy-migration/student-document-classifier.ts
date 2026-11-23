/**
 * Filename parsing + classification for the legacy student file dump.
 *
 * Unlike the school dump, student filenames are a fixed vocabulary — the old
 * system wrote one of ~10 known names per document type. That makes exact stem
 * matching reliable, so 'other' is a genuine fallback rather than a dumping
 * ground.
 *
 * Folder names: {legacy_num}_{student_code}_{SURNAME}_{FirstName}
 * The legacy numeric prefix is a separate sequence — it equals the student code
 * number in only 384 of 11,259 cases, so the two are NOT interchangeable.
 */

/**
 * Archived versions carry a 14-digit timestamp. Most are renamed to .old, but
 * photos keep their real extension (Photo_20240917101614.bmp) — so the marker
 * is the timestamp, not the .old suffix. Both forms always sit alongside the
 * live file in the same folder.
 */
const ARCHIVE_MARKER = /_(\d{14})(\.[A-Za-z0-9]+)?$/

/**
 * Some documents have a "(L)" variant (e.g. AATest_Essay(L).pdf). It marks a
 * variant of the same document type, not a different type.
 */
const VARIANT_SUFFIX = /\(L\)$/i

/** Filename stem (lowercased, variant-stripped) -> document_categories.code */
const STEM_TO_CATEGORY: Record<string, string> = {
  aatest_mathandgrammar: 'aa_test_math_grammar',
  aatest_essay: 'aa_test_essay',
  reportandcertificate: 'report_and_certificate',
  passport: 'passport_copy',
  cv: 'cv',
  musicachievement: 'music_achievement',
  birthcertificate: 'birth_certificate',
  ukiset: 'ukiset',
  ielts: 'ielts',
}

/** Photos are a profile attribute, not a document — they go to students.photo_url. */
const PHOTO_STEM = 'photo'

export type ParsedStudentFile = {
  fileName: string
  /** Name with the archive timestamp stripped. */
  baseName: string
  extension: string
  archived: boolean
  /** True when this is the student's profile photo rather than a document. */
  isPhoto: boolean
  /** True when the stem carried the (L) variant marker. */
  isVariant: boolean
  categoryCode: string
  /** Human-readable label for the UI. */
  title: string
}

export function parseStudentFile(fileName: string): ParsedStudentFile {
  // Restore the real extension when the archive marker preceded one, so the
  // stem still classifies correctly for reporting.
  const baseName = fileName.replace(
    ARCHIVE_MARKER,
    (_match, _ts, ext: string | undefined) => (ext && ext.toLowerCase() !== '.old' ? ext : '')
  )
  const archived = ARCHIVE_MARKER.test(fileName) || /\.old$/i.test(fileName)

  const dot = baseName.lastIndexOf('.')
  const extension = dot > 0 ? baseName.slice(dot + 1).toLowerCase() : ''
  const rawStem = dot > 0 ? baseName.slice(0, dot) : baseName

  const isVariant = VARIANT_SUFFIX.test(rawStem)
  const stem = rawStem.replace(VARIANT_SUFFIX, '').toLowerCase()

  const isPhoto = stem === PHOTO_STEM
  const categoryCode = isPhoto ? 'photo' : (STEM_TO_CATEGORY[stem] ?? 'other')

  return {
    fileName, baseName, extension, archived, isPhoto, isVariant,
    categoryCode,
    title: titleFor(categoryCode, rawStem, isVariant),
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  aa_test_math_grammar: 'AA Test — Math and Grammar',
  aa_test_essay: 'AA Test — Essay',
  report_and_certificate: 'Report and Certificate',
  passport_copy: 'Passport',
  cv: 'CV',
  music_achievement: 'Music Achievement',
  birth_certificate: 'Birth Certificate',
  ukiset: 'UKiset',
  ielts: 'IELTS',
}

/**
 * Known types get their proper label; unknown ones (Document13.pdf and friends)
 * keep the original stem so nothing becomes unidentifiable in the UI.
 */
function titleFor(categoryCode: string, rawStem: string, isVariant: boolean): string {
  const label = CATEGORY_LABELS[categoryCode]
  if (!label) return rawStem.replace(/[_-]+/g, ' ').trim()
  return isVariant ? `${label} (L)` : label
}

export type ParsedFolder = {
  folder: string
  legacyNumId: string
  studentCode: string | null
  nameSlug: string
}

/** Splits {legacy_num}_{student_code}_{NAME}; student_code may be absent. */
export function parseStudentFolder(folder: string): ParsedFolder | null {
  const parts = folder.split('_')
  if (parts.length < 2 || !/^\d+$/.test(parts[0])) return null
  const hasCode = /^S\d+$/i.test(parts[1])
  return {
    folder,
    legacyNumId: parts[0],
    studentCode: hasCode ? parts[1].toUpperCase() : null,
    nameSlug: parts.slice(hasCode ? 2 : 2).join('_'),
  }
}
