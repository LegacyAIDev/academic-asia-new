/**
 * Data Migration: infer schools.offers_a_level / offers_ib from published results.
 *
 * Usage:
 *   npx tsx scripts/41_backfill-school-offers-flags.ts --dry-run
 *   npx tsx scripts/41_backfill-school-offers-flags.ts
 *   npx tsx scripts/41_backfill-school-offers-flags.ts --overwrite
 *
 * The comparison export needs to tell two different things apart: a school that
 * runs a qualification but has not published figures (prints "NP"), and a school
 * that does not run it at all (prints "not offered"). That is why the columns are
 * nullable — NULL means nobody has answered the question yet.
 *
 * A school with at least one A-Level or IB result row demonstrably runs that
 * qualification, so those are set to TRUE. The absence of results proves nothing
 * — the school may simply not have had its figures entered — so those rows are
 * deliberately LEFT NULL rather than set to FALSE. Only a human, via the school
 * form, should assert "does not offer".
 *
 * Both flags are editable in the school form, so by default this only fills rows
 * that are still NULL. --overwrite re-derives every row and will discard manual
 * corrections.
 *
 * Idempotent: recomputed from results every run.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const OVERWRITE = args.includes('--overwrite')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SECRET_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local')
  process.exit(1)
}

const PAGE_SIZE = 1000

/** Exam type code -> the schools column it provides evidence for. */
const EVIDENCE: { examCode: string; column: 'offers_a_level' | 'offers_ib' }[] = [
  { examCode: 'a_level', column: 'offers_a_level' },
  { examCode: 'ib', column: 'offers_ib' },
]

async function schoolIdsWithResults(
  supabase: SupabaseClient,
  examTypeId: number
): Promise<Set<string>> {
  const ids = new Set<string>()
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('school_academic_results')
      .select('school_id')
      .eq('exam_type_id', examTypeId)
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      console.error('Read failed:', error.message)
      process.exit(1)
    }
    if (!data || data.length === 0) break
    for (const row of data as { school_id: string }[]) ids.add(row.school_id)
    if (data.length < PAGE_SIZE) break
  }
  return ids
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SECRET_KEY!)

  for (const { examCode, column } of EVIDENCE) {
    const { data: examType, error: typeError } = await supabase
      .from('academic_exam_types')
      .select('id')
      .eq('code', examCode)
      .single()

    if (typeError || !examType) {
      console.error(`Could not resolve exam type "${examCode}":`, typeError?.message)
      process.exit(1)
    }

    const withResults = await schoolIdsWithResults(supabase, (examType as { id: number }).id)

    // Only touch rows still unanswered, unless explicitly overwriting.
    let query = supabase.from('schools').select('id, ' + column)
    if (!OVERWRITE) query = query.is(column, null)

    const { data: candidates, error: candidateError } = await query
    if (candidateError) {
      console.error('Read failed:', candidateError.message)
      process.exit(1)
    }

    const toSet = (candidates ?? [])
      .map((r) => r as unknown as { id: string })
      .filter((r) => withResults.has(r.id))

    console.log(
      `${column}: ${withResults.size} schools have ${examCode} results, ` +
        `${toSet.length} to set true${OVERWRITE ? ' (overwrite)' : ' (still null)'}`
    )

    if (DRY_RUN || toSet.length === 0) continue

    const { error: updateError } = await supabase
      .from('schools')
      .update({ [column]: true } as never)
      .in('id', toSet.map((r) => r.id))

    if (updateError) {
      console.error(`  FAILED ${column}: ${updateError.message}`)
      process.exit(1)
    }
    console.log(`  set ${toSet.length} rows`)
  }

  if (DRY_RUN) console.log('\n--dry-run: no writes.')
  console.log('\nSchools without results are left NULL, not false — absence of published')
  console.log('figures is not evidence that a school does not run the qualification.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
