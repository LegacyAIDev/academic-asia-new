/**
 * Data Migration: split the legacy boarder age string into a whole-school age range.
 *
 * Usage:
 *   npx tsx scripts/39_backfill-school-age-range.ts --dry-run
 *   npx tsx scripts/39_backfill-school-age-range.ts
 *   npx tsx scripts/39_backfill-school-age-range.ts --overwrite
 *
 * legacy_boarder_age_range holds two ranges in one string, e.g. "11-18 (3-18)":
 * the boarding age range, then the whole-school age range in brackets. The
 * structured boarder_age_min/max columns captured only the first half, so the
 * bracketed whole-school range — which the printed comparison sheet shows — was
 * never stored anywhere.
 *
 * Shapes present in the data:
 *   "11-18 (3-18)"  boarding 11-18, school 3-18
 *   "13-18 (13-18)" both the same
 *   "Day (4-18)"    day school, no boarding; school 4-18
 *   "(16+)"         open-ended upper bound, no lower boarding figure
 *   "16+ (16+)"     open-ended
 *
 * Only school_age_min/max are written. boarder_age_min/max already exist and are
 * left alone — this fills the gap rather than re-deriving what is already there.
 *
 * Idempotent: recomputed from the same source string every run.
 */

import * as fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
/**
 * school_age_min/max are editable in the school form, so a plain rerun would
 * overwrite whatever staff corrected by hand. By default only rows that have no
 * value yet are written. Pass --overwrite to re-derive every row, which is what
 * you want after changing the parser itself.
 */
const OVERWRITE = args.includes('--overwrite')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SECRET_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local')
  process.exit(1)
}

const SKIPPED_REPORT = 'data/school-age-range-skipped.json'

interface SchoolRow {
  id: string
  name: string
  legacy_boarder_age_range: string | null
  school_age_min: number | null
  school_age_max: number | null
}

export interface AgeRange {
  min: number | null
  max: number | null
}

/**
 * Pull the whole-school range out of the bracketed half of the legacy string.
 * Returns null when there is no bracketed section to read.
 */
export function parseSchoolAgeRange(legacy: string | null): AgeRange | null {
  if (!legacy) return null

  // Some values carry two bracketed groups, e.g. "16-19(Homestay)(16-19)".
  // The age range is always the last one; earlier groups annotate the boarding
  // arrangement.
  const groups = [...legacy.matchAll(/\(([^)]+)\)/g)]
  if (groups.length === 0) return null

  const inner = groups[groups.length - 1][1].trim()

  // "3-18"
  const range = inner.match(/^(\d{1,2})\s*[-–]\s*(\d{1,2})$/)
  if (range) {
    const min = parseInt(range[1], 10)
    const max = parseInt(range[2], 10)
    return min <= max ? { min, max } : null
  }

  // "16+" — lower bound only, upper deliberately left open.
  const openEnded = inner.match(/^(\d{1,2})\s*\+$/)
  if (openEnded) return { min: parseInt(openEnded[1], 10), max: null }

  return null
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SECRET_KEY!)

  const { data, error } = await supabase
    .from('schools')
    .select('id, name, legacy_boarder_age_range, school_age_min, school_age_max')
    .not('legacy_boarder_age_range', 'is', null)

  if (error) {
    console.error('Read failed:', error.message)
    process.exit(1)
  }

  const rows = (data ?? []) as SchoolRow[]
  console.log(`Schools with a legacy age string: ${rows.length}`)

  const resolved: { id: string; name: string; min: number | null; max: number | null }[] = []
  const skipped: { name: string; value: string }[] = []

  let preserved = 0

  for (const row of rows) {
    const alreadySet = row.school_age_min !== null || row.school_age_max !== null
    if (alreadySet && !OVERWRITE) {
      preserved += 1
      continue
    }

    const range = parseSchoolAgeRange(row.legacy_boarder_age_range)
    if (range) {
      resolved.push({ id: row.id, name: row.name, min: range.min, max: range.max })
    } else {
      skipped.push({ name: row.name, value: row.legacy_boarder_age_range ?? '' })
      // Under --overwrite the derived value must track the source. If the source
      // no longer parses, clear the old value rather than leaving it stranded.
      if (alreadySet) resolved.push({ id: row.id, name: row.name, min: null, max: null })
    }
  }

  console.log(`Resolved: ${resolved.length}`)
  console.log(`Unresolved: ${skipped.length}`)
  if (preserved > 0) {
    console.log(`Left alone (already set, no --overwrite): ${preserved}`)
  }

  fs.writeFileSync(SKIPPED_REPORT, JSON.stringify({ total: skipped.length, rows: skipped }, null, 2))
  console.log(`Unresolved values written to ${SKIPPED_REPORT}`)

  if (DRY_RUN) {
    console.log('\n--dry-run: no writes. Sample:')
    resolved.slice(0, 12).forEach((r) => console.log(`  ${r.min ?? '?'}-${r.max ?? '+'}  ${r.name}`))
    return
  }

  let written = 0
  for (const r of resolved) {
    const { error: updateError } = await supabase
      .from('schools')
      .update({ school_age_min: r.min, school_age_max: r.max } as never)
      .eq('id', r.id)

    if (updateError) {
      console.error(`  FAILED ${r.name}: ${updateError.message}`)
      process.exit(1)
    }
    written += 1
    if (written % 100 === 0) console.log(`  written ${written}/${resolved.length}`)
  }

  console.log(`Done. ${written} schools updated.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
