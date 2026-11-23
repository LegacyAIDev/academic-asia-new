/**
 * Filename parsing + classification for the legacy school file dump.
 *
 * Legacy names follow: [PROCEED_]{YEAR}_[YEARLEVEL_][MA_]{Description}.{ext}
 * e.g. PROCEED_2023_YEAR10_MA_MusicScholarshipApplicationProcedure.pdf
 *
 * Classification is deliberately conservative: only assign a category when the
 * filename says so unambiguously, otherwise 'other'. Everything in 'other'
 * renders as the flat document list the legacy system used, and can be
 * re-classified later with an UPDATE — no re-upload required.
 */

/** Archived versions are suffixed with a 14-digit timestamp + .old */
const ARCHIVE_SUFFIX = /_(\d{14})\.old$/

export type MediaField = 'logo_url' | 'campus_image_url' | 'map_url'

/**
 * Branding assets belong on the school record rather than the document list.
 * Several stems can target the same field (Logo.png and School_logo.jpg both
 * being a logo), so each carries a precedence — lower wins — to keep the
 * outcome deterministic when a school has more than one candidate.
 */
export const MEDIA_STEMS: Record<string, { field: MediaField; precedence: number }> = {
  logo:        { field: 'logo_url',         precedence: 0 },
  school_logo: { field: 'logo_url',         precedence: 1 },
  campus:      { field: 'campus_image_url', precedence: 0 },
  map:         { field: 'map_url',          precedence: 0 },
}

export type ParsedSchoolFile = {
  fileName: string
  /** Filename with the archive timestamp stripped — the "real" name. */
  baseName: string
  extension: string
  archived: boolean
  academicYear: string | null
  yearLevel: string | null
  isMusicAudition: boolean
  isProceed: boolean
  categoryCode: string
  /** Set when the file is a branding asset rather than a document. */
  mediaField: MediaField | null
  /** Lower wins when two files target the same media field. */
  mediaPrecedence: number
  /** Cleaned, human-readable title for the UI. */
  title: string
}

export function parseSchoolFile(fileName: string): ParsedSchoolFile {
  const archived = ARCHIVE_SUFFIX.test(fileName)
  const baseName = fileName.replace(ARCHIVE_SUFFIX, '')

  // Archived files sometimes have no extension at all once the timestamp is
  // stripped, so an empty extension is valid — MIME is sniffed from content.
  const dot = baseName.lastIndexOf('.')
  const extension = dot > 0 ? baseName.slice(dot + 1).toLowerCase() : ''
  const stem = dot > 0 ? baseName.slice(0, dot) : baseName

  const isProceed = /^PROCEED_/i.test(stem)
  const isMusicAudition = /(^|_)MA(_|$)/.test(stem)

  const yearMatch = stem.match(/(?:^|_)((?:19|20)\d{2}(?:-\d{2,4})?)(?:_|$)/)
  const academicYear = yearMatch ? yearMatch[1] : null

  const levelMatch = stem.match(/(?:^|_)(YEAR\d+|ALLYEAE?R)(?:_|$)/i)
  // ALLYEAER is a recurring typo in the source data — normalise it.
  const yearLevel = levelMatch
    ? levelMatch[1].toUpperCase().replace('ALLYEAER', 'ALLYEAR')
    : null

  const media = MEDIA_STEMS[stem.toLowerCase()] ?? null
  const mediaField = media?.field ?? null

  return {
    fileName, baseName, extension, archived,
    academicYear, yearLevel, isMusicAudition, isProceed,
    categoryCode: classify(stem, extension, mediaField),
    mediaField,
    mediaPrecedence: media?.precedence ?? Number.MAX_SAFE_INTEGER,
    title: toTitle(stem),
  }
}

function classify(
  stem: string,
  extension: string,
  mediaField: string | null
): string {
  if (mediaField) return 'school_gallery' // overridden by media routing at import
  const s = stem.toLowerCase()

  if (/^(img_|photo|dsc)/.test(s) || ['jpg', 'jpeg', 'png'].includes(extension)) {
    return 'school_gallery'
  }
  if (s.includes('factsheet')) return 'school_factsheet'
  if (s.includes('prospectus')) return 'school_prospectus'

  // Specific document kinds first — several of these also contain generic words
  // like "form" or "information" that the broader rules below would swallow.
  if (/scholarship|bursary/.test(s)) return 'school_scholarship'
  if (/summer[-_ ]?(school|programme|program|course)|holiday[-_ ]?course/.test(s)) {
    return 'school_summer_programme'
  }
  if (/term[-_ ]?dates|key[-_ ]?dates|calendar/.test(s)) return 'school_term_dates'
  if (/terms[-_ ]?(and|&)?[-_ ]?conditions|t&c|contract|agreement/.test(s)) return 'school_agreement'
  if (s.includes('guardian')) return 'school_guardianship'
  if (/medical|medication|allerg|welfare|vaccin/.test(s)) return 'school_medical'
  if (/pre[-_ ]?arrival|boarding|handbook|uniform|induction/.test(s)) return 'school_pre_arrival'
  if (/reading[-_ ]?list|curriculum|syllabus|subject[-_ ]?options/.test(s)) return 'school_curriculum'
  if (/result|destination|league[-_ ]?table/.test(s)) return 'school_exam_results'
  if (/fee|bank|payment|invoice|deposit/.test(s)) return 'school_fee_schedule'
  if (/^proceed_|regform|reg[-_ ]?form|application|admission|entry[-_ ]?requirement|registration/.test(s)) {
    return 'school_application'
  }
  // Marketing collateral — school_brochure existed but nothing ever matched it.
  if (/brochure|booklet|flyer|leaflet|presentation|newsletter[-_ ]?pack/.test(s)) {
    return 'school_brochure'
  }
  if (/letter|newsletter|bulletin/.test(s)) return 'school_correspondence'
  return 'other'
}

/** Strip workflow markers and separators so the UI shows something readable. */
function toTitle(stem: string): string {
  return stem
    .replace(/^PROCEED_/i, '')
    .replace(/(^|_)MA(_|$)/, '$1')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
