/**
 * Data Migration: resolve school fee bands to an explicit year-level range.
 *
 * Usage:
 *   npx tsx scripts/38_backfill-fee-year-levels.ts --dry-run
 *   npx tsx scripts/38_backfill-fee-year-levels.ts
 *
 * Migration 042 added school_fees.year_levels as a comma-separated multi-select
 * but nothing ever populated it — it is empty across all 37,400 rows. The real
 * year level lives in the free-text `description` ("Year 12", "Y9", "Year 9-13").
 *
 * The comparison export renders fee bands as "Year 9 - Year 13" and the schools
 * list filters on the cheapest band, so both need an ordered from/to pair. This
 * resolves it once into year_level_from / year_level_to rather than re-parsing
 * free text on every render.
 *
 * Only course fees are touched. Registration fees, deposits and "others" are not
 * year-banded.
 *
 * About 5% of course rows do not resolve, and that is correct rather than a
 * failure: they are course programmes ("1 Year AL", "Foundation", "English
 * Course") and the catch-all "Others", which are real fees but not tied to a
 * year level. They are written to the skipped report and left NULL — the export
 * omits them rather than inventing a band. Grade N and Form N are also left
 * alone; mapping those onto UK year levels is a judgement call about a handful
 * of overseas schools, not a parse.
 *
 * Idempotent: re-running recomputes the same values from the same descriptions.
 */

import * as fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { parseYearLevelRange } from '../src/lib/schools/year-levels'

dotenv.config({ path: '.env.local' })

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SECRET_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local')
  process.exit(1)
}

const SKIPPED_REPORT = 'data/fee-year-levels-skipped.json'
const PAGE_SIZE = 1000

interface FeeRow {
  id: string
  description: string | null
  fee_type_id: number | null
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SECRET_KEY!)

  const { data: courseType, error: typeError } = await supabase
    .from('fee_types')
    .select('id')
    .eq('code', 'course')
    .single()

  if (typeError || !courseType) {
    console.error('Could not resolve the "course" fee type:', typeError?.message)
    process.exit(1)
  }
  const courseTypeId = (courseType as { id: number }).id

  // Page through every course fee row.
  const rows: FeeRow[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('school_fees')
      .select('id, description, fee_type_id')
      .eq('fee_type_id', courseTypeId)
      .order('id')
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      console.error('Read failed:', error.message)
      process.exit(1)
    }
    if (!data || data.length === 0) break
    rows.push(...(data as FeeRow[]))
    if (data.length < PAGE_SIZE) break
  }

  console.log(`Course fee rows: ${rows.length}`)

  const updates: { id: string }[] = []
  const skipped = new Map<string, number>()

  for (const row of rows) {
    const range = parseYearLevelRange(row.description)
    if (range) {
      updates.push({ id: row.id })
    } else {
      const key = row.description?.trim() || '(blank)'
      skipped.set(key, (skipped.get(key) ?? 0) + 1)
    }
  }

  const skippedTotal = rows.length - updates.length
  const pct = ((updates.length / rows.length) * 100).toFixed(1)
  console.log(`Resolved: ${updates.length} (${pct}%)`)
  console.log(`Unresolved: ${skippedTotal} across ${skipped.size} distinct descriptions`)

  const skippedSorted = [...skipped.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([description, count]) => ({ description, count }))

  fs.writeFileSync(
    SKIPPED_REPORT,
    JSON.stringify({ generatedFor: 'course fees', total: skippedTotal, descriptions: skippedSorted }, null, 2)
  )
  console.log(`Unresolved descriptions written to ${SKIPPED_REPORT}`)

  // 30,000 single-row updates would be 30,000 round trips. The mapping is a pure
  // function of the description and there are only ~30 distinct mapped values, so
  // write one statement per description instead.
  const byDescription = new Map<string, { from: string; to: string; count: number }>()
  for (const row of rows) {
    const range = parseYearLevelRange(row.description)
    if (!range || row.description === null) continue
    const existing = byDescription.get(row.description)
    if (existing) existing.count += 1
    else byDescription.set(row.description, { from: range.from, to: range.to, count: 1 })
  }

  if (DRY_RUN) {
    console.log('\n--dry-run: no writes. Statements that would run:')
    for (const [description, r] of [...byDescription].sort((a, b) => b[1].count - a[1].count)) {
      console.log(`  ${r.count.toString().padStart(5)}  "${description}" -> ${r.from} .. ${r.to}`)
    }
    return
  }

  let written = 0
  for (const [description, r] of byDescription) {
    const { error } = await supabase
      .from('school_fees')
      .update({ year_level_from: r.from, year_level_to: r.to } as never)
      .eq('fee_type_id', courseTypeId)
      .eq('description', description)

    if (error) {
      console.error(`  FAILED "${description}": ${error.message}`)
      process.exit(1)
    }
    written += r.count
    console.log(`  ${r.count.toString().padStart(5)}  "${description}" -> ${r.from} .. ${r.to}`)
  }

  console.log(`Done. ${written} rows updated across ${byDescription.size} descriptions.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
