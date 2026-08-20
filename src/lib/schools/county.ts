/**
 * County normalisation for the schools list filter.
 *
 * schools.county is free text and held 101 distinct values across 707 schools:
 * placeholders ("N/A", "-", "UK"), nations rather than counties ("Scotland"),
 * four spellings of London, towns used in place of their county, and a handful
 * of non-UK locations. Filtering on it directly gives an unusable dropdown.
 *
 * The raw county is never modified — it is what staff typed and what the school
 * detail page shows. county_normalised is a cleaned copy used only for filtering.
 *
 * Shared by the backfill script and the create/update school actions so a newly
 * entered county is normalised on write and does not drift out of the filter.
 */

/** Values that carry no county information. */
const PLACEHOLDERS = new Set(['n/a', 'na', '-', '', 'uk'])

/**
 * Nations, regions and non-UK locations. These are real places but not counties;
 * schools.country_id already records the nation, so keeping them here would put
 * "Scotland" in a county dropdown.
 */
const NOT_A_COUNTY = new Set([
  'scotland',
  'northern ireland',
  'ireland',
  'north wales',
  'south wales',
  'belfast',
  'hong kong',
  'macau',
  'b.c.',
  'porto',
  'vienna',
  'zhejiang',
  'selangor',
  'negeri sembilan darul khusus',
])

/** Explicit corrections. Keys are lowercased raw values. */
const CORRECTIONS: Record<string, string> = {
  // London: four spellings plus localities that are inside Greater London.
  london: 'Greater London',
  'london & greater london': 'Greater London',
  'greater london': 'Greater London',
  'london area': 'Greater London',
  highgate: 'Greater London',
  twickenham: 'Greater London',
  wallington: 'Greater London',
  hampton: 'Greater London',

  // Towns and cities entered where the county belongs.
  cambridge: 'Cambridgeshire',
  peterborough: 'Cambridgeshire',
  oxford: 'Oxfordshire',
  guildford: 'Surrey',
  hove: 'East Sussex',
  'haywards heath, uk': 'West Sussex',
  birmingham: 'West Midlands',
  manchester: 'Greater Manchester',
  bolton: 'Greater Manchester',
  durham: 'County Durham',
  hull: 'East Riding of Yorkshire',
  greenock: 'Inverclyde',

  // Compound values with the county embedded.
  'poole, dorset': 'Dorset',
  'conwy, north wales': 'Conwy',
  'yorkshire area west': 'West Yorkshire',
  'east yorkshire': 'East Riding of Yorkshire',
}

export function normaliseCounty(raw: string | null): string | null {
  if (!raw) return null

  const trimmed = raw.trim().replace(/\s+/g, ' ')
  const key = trimmed.toLowerCase()

  if (PLACEHOLDERS.has(key)) return null
  if (NOT_A_COUNTY.has(key)) return null
  if (CORRECTIONS[key]) return CORRECTIONS[key]

  return trimmed
}
