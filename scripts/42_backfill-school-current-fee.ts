/**
 * Data Migration: populate schools.current_course_fee for the schools list filter.
 *
 * Usage:
 *   npx tsx scripts/42_backfill-school-current-fee.ts --dry-run
 *   npx tsx scripts/42_backfill-school-current-fee.ts
 *
 * The list needs to answer "fee <= X" across all 707 schools while paginating.
 * That cannot be a join from PostgREST, and feeding a list of matching ids back
 * into the query overflows the URL at this row count, so the resolved figure is
 * cached on schools and indexed (migration 078).
 *
 * The rule itself lives in SQL — refresh_school_current_fee() — and is the same
 * one the export applies in resolveCurrentFee(): course fees only, positive
 * amounts, latest financial year present, lowest band of that year. This script
 * only invokes it for every school; it deliberately does not reimplement it,
 * so the two definitions cannot drift.
 *
 * Ongoing freshness is handled by the fee actions, which call the same function
 * after every create, update and delete. Run this after a bulk fee import, or to
 * repair the cache.
 *
 * Idempotent: the function only writes rows whose cached value actually changed.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const DRY_RUN = process.argv.slice(2).includes('--dry-run')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SECRET_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local')
  process.exit(1)
}

async function summarise(supabase: SupabaseClient, label: string) {
  const { count: total } = await supabase
    .from('schools')
    .select('id', { count: 'exact', head: true })
  const { count: withFee } = await supabase
    .from('schools')
    .select('id', { count: 'exact', head: true })
    .not('current_course_fee', 'is', null)

  console.log(`${label}: ${withFee ?? 0} of ${total ?? 0} schools have a cached current fee`)
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SECRET_KEY!)

  await summarise(supabase, 'Before')

  if (DRY_RUN) {
    console.log('\n--dry-run: refresh_school_current_fee(null) not called.')
    console.log('It would recompute every school from school_fees and write only the rows that differ.')
    return
  }

  const { error } = await supabase.rpc('refresh_school_current_fee', {
    target_school_id: null,
  } as never)

  if (error) {
    console.error('Refresh failed:', error.message)
    process.exit(1)
  }

  await summarise(supabase, 'After')
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
