/**
 * Data Migration: populate schools.county_normalised for the schools list filter.
 *
 * Usage:
 *   npx tsx scripts/40_normalise-school-county.ts --dry-run
 *   npx tsx scripts/40_normalise-school-county.ts
 *
 * schools.county is free text and holds 101 distinct values across 707 schools.
 * Filtering on it directly produces a dropdown containing "N/A", "Hong Kong",
 * "Scotland" and four different spellings of London.
 *
 * The raw county is never modified — it is what staff typed and what the school
 * detail page shows. This writes a cleaned copy alongside it, used only for
 * filtering.
 *
 * The mapping itself lives in src/lib/schools/county.ts, shared with the create
 * and update school actions so newly entered counties are normalised on write.
 * This script exists to apply it to rows that predate that, and to re-apply it
 * after the mapping is extended.
 *
 * Idempotent: mapping is applied to the raw county every run.
 */

import * as fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { normaliseCounty } from '../src/lib/schools/county'

dotenv.config({ path: '.env.local' })

const DRY_RUN = process.argv.slice(2).includes('--dry-run')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SECRET_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local')
  process.exit(1)
}

const MAPPING_REPORT = 'data/county-normalisation-mapping.json'

async function main() {
  const supabase = createClient(SUPABASE_URL, SECRET_KEY!)

  const { data, error } = await supabase.from('schools').select('id, name, county')

  if (error) {
    console.error('Read failed:', error.message)
    process.exit(1)
  }

  const rows = (data ?? []) as { id: string; name: string; county: string | null }[]

  // Group by raw value so the write is one statement per distinct county.
  const byRaw = new Map<string, { normalised: string | null; count: number }>()
  for (const row of rows) {
    if (row.county === null) continue
    const existing = byRaw.get(row.county)
    if (existing) existing.count += 1
    else byRaw.set(row.county, { normalised: normaliseCounty(row.county), count: 1 })
  }

  const changed = [...byRaw.entries()].filter(([raw, r]) => r.normalised !== raw)
  const nulled = changed.filter(([, r]) => r.normalised === null)
  const remapped = changed.filter(([, r]) => r.normalised !== null)
  const distinctAfter = new Set(
    [...byRaw.values()].map((r) => r.normalised).filter((v): v is string => v !== null)
  )

  console.log(`Schools: ${rows.length}`)
  console.log(`Distinct raw counties: ${byRaw.size} -> distinct normalised: ${distinctAfter.size}`)
  console.log(`Dropped to NULL: ${nulled.length} values (${nulled.reduce((s, [, r]) => s + r.count, 0)} schools)`)
  console.log(`Remapped: ${remapped.length} values (${remapped.reduce((s, [, r]) => s + r.count, 0)} schools)`)

  const report = {
    droppedToNull: nulled.map(([raw, r]) => ({ raw, schools: r.count })),
    remapped: remapped.map(([raw, r]) => ({ raw, to: r.normalised, schools: r.count })),
    unchanged: [...byRaw.entries()]
      .filter(([raw, r]) => r.normalised === raw)
      .map(([raw, r]) => ({ raw, schools: r.count }))
      .sort((a, b) => b.schools - a.schools),
  }
  fs.writeFileSync(MAPPING_REPORT, JSON.stringify(report, null, 2))
  console.log(`Full mapping written to ${MAPPING_REPORT}`)

  if (DRY_RUN) {
    console.log('\n--dry-run: no writes.')
    console.log('\nDROPPED TO NULL:')
    nulled.forEach(([raw, r]) => console.log(`  ${r.count.toString().padStart(3)}  "${raw}"`))
    console.log('\nREMAPPED:')
    remapped.forEach(([raw, r]) => console.log(`  ${r.count.toString().padStart(3)}  "${raw}" -> "${r.normalised}"`))
    return
  }

  let written = 0
  for (const [raw, r] of byRaw) {
    const { error: updateError } = await supabase
      .from('schools')
      .update({ county_normalised: r.normalised } as never)
      .eq('county', raw)

    if (updateError) {
      console.error(`  FAILED "${raw}": ${updateError.message}`)
      process.exit(1)
    }
    written += r.count
  }

  console.log(`Done. ${written} schools updated across ${byRaw.size} distinct raw values.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
