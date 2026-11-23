/**
 * End-to-end check that background (supplementary) information can be added to
 * a school. It used to fail on every save: the old system's free-text type was
 * a required column, and the app files new entries under a category instead
 * (migration 20261123221316).
 * Needs psql on PATH and E2E_DB_URL for the local test database.
 */
import { execFileSync } from 'node:child_process'
import { assert, choose, click, launch, open, SEED, seeText, signIn, step, summary } from './lib/harness.mjs'

const DB = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = query => execFileSync('psql', [DB, '-X', '-A', '-t', '-q', '-c', query], { encoding: 'utf8' }).trim()
const DIALOG = '[role="dialog"]'
const INFO = 'UAT supinfo: boarding houses refurbished'

const reset = () => sql(`delete from public.school_supplementary_info where info like 'UAT supinfo%'`)
reset()

const browser = await launch()
try {
  const { page } = await signIn(browser, 'manager@aa.test')

  await step(page, 'background information is added to a school under a category', async () => {
    await open(page, `/schools/${SEED.headington}?tab=notes`)
    await click(page, 'Add background info')
    await seeText(page, 'Add Supplementary Info', DIALOG)
    await new Promise(resolve => setTimeout(resolve, 400))
    await choose(page, `${DIALOG} button[role="combobox"]`, 'Boarding & Holidays')
    await page.type(`${DIALOG} textarea[name="info"]`, INFO)
    await click(page, 'Add Info', DIALOG)
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { polling: 100, timeout: 20000 })
    const saved = sql(`select c.code || '|' || coalesce(s.legacy_info_type, '-') from public.school_supplementary_info s
      join public.school_sup_info_categories c on c.id = s.category_id where s.info = '${INFO}'`)
    assert(saved === 'boarding_holidays|-', `saved row: ${saved}`)
    await seeText(page, INFO)
  })
} finally {
  reset()
  await browser.close()
}
process.exit(summary() ? 1 : 0)
