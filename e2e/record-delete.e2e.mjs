/**
 * End-to-end check of deleting a record from its row: the bin opens an "are you
 * sure" dialog naming the record, Cancel keeps it, Delete removes it. Covers the
 * shared ConfirmDeleteButton on a school record (a fee) and a student record (a
 * visa application).
 * Needs psql on PATH and E2E_DB_URL for the local test database.
 */
import { execFileSync } from 'node:child_process'
import { assert, click, launch, open, SEED, seeText, signIn, step, summary } from './lib/harness.mjs'

const DB = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = query => execFileSync('psql', [DB, '-X', '-A', '-t', '-q', '-c', query], { encoding: 'utf8' }).trim()
const CONFIRM = '[role="alertdialog"]'
const FEE = 'UAT delete fee'

const reset = () => {
  sql(`delete from public.school_fees where description = '${FEE}'`)
  sql(`delete from public.student_visas where student_id = '${SEED.student}' and remarks = 'UAT delete'`)
}
reset()
sql(`insert into public.school_fees (school_id, description) values ('${SEED.brighton}', '${FEE}')`)
sql(`insert into public.student_visas (student_id, school_id, remarks) values ('${SEED.student}', '${SEED.brighton}', 'UAT delete')`)

const feeCount = () => sql(`select count(*) from public.school_fees where description = '${FEE}'`)
const visaCount = () => sql(`select count(*) from public.student_visas where student_id = '${SEED.student}' and remarks = 'UAT delete'`)

/** Clicks the bin on the table row that contains `text`. */
async function binOnRow(page, text) {
  const row = await page.waitForFunction(t => [...document.querySelectorAll('tbody tr')].find(r => r.innerText.includes(t)) ?? null, { polling: 100 }, text)
  await (await row.asElement().$('button[aria-label="Delete"]')).click()
  await page.waitForSelector(CONFIRM)
}

const browser = await launch()
try {
  const { page } = await signIn(browser, 'manager@aa.test')

  await step(page, 'a school fee: Cancel keeps it, Delete removes it', async () => {
    await open(page, `/schools/${SEED.brighton}?tab=fees`)
    // The tab opens on the latest financial year; this fee has none.
    await page.click('button[aria-label="Financial year"]')
    await click(page, 'All years', '[role="listbox"]', { prefix: true })
    await page.waitForFunction(() => !document.querySelector('[role="listbox"]') && getComputedStyle(document.body).pointerEvents !== 'none', { polling: 100 })
    await binOnRow(page, FEE)
    await seeText(page, 'Delete Fee', CONFIRM)
    await seeText(page, FEE, CONFIRM)
    await click(page, 'Cancel', CONFIRM)
    await page.waitForFunction(() => !document.querySelector('[role="alertdialog"]'), { polling: 100 })
    assert(feeCount() === '1', 'Cancel deleted the fee')
    await binOnRow(page, FEE)
    await click(page, 'Delete', CONFIRM)
    await page.waitForFunction(() => !document.querySelector('[role="alertdialog"]'), { polling: 100, timeout: 20000 })
    assert(feeCount() === '0', 'fee still stored')
  })

  await step(page, 'a student visa application is deleted the same way', async () => {
    await open(page, `/students/${SEED.student}?tab=immigration`)
    await binOnRow(page, 'Brighton College')
    await seeText(page, 'Delete Visa Application', CONFIRM)
    await click(page, 'Delete', CONFIRM)
    await page.waitForFunction(() => !document.querySelector('[role="alertdialog"]'), { polling: 100, timeout: 20000 })
    assert(visaCount() === '0', 'visa still stored')
  })
} finally {
  reset()
  await browser.close()
}
process.exit(summary() ? 1 : 0)
