/**
 * End-to-end check of the bulk import of schools' published exam results
 * (client request, 17 Nov): the sample CSV downloads, an upload is previewed
 * (to add, to update, lines with problems) before anything is saved, importing
 * adds and updates, and uploading the same file again only updates.
 * Needs psql on PATH and E2E_DB_URL for the local test database.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { assert, click, launch, open, SEED, seeText, signIn, step, summary } from './lib/harness.mjs'

const DB = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = query => execFileSync('psql', [DB, '-X', '-A', '-t', '-q', '-c', query], { encoding: 'utf8' }).trim()
const DIALOG = '[role="dialog"]'
const YEAR = 2019
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const brighton = sql(`select name from public.schools where id = '${SEED.brighton}'`)
const sevenoaks = sql(`select name from public.schools where name = 'Sevenoaks School' limit 1`)

const reset = () => sql(`delete from public.school_academic_results where exam_year = ${YEAR}`)
reset()
// A result already stored: the import should update it, not add a second.
sql(`insert into public.school_academic_results (school_id, exam_year, exam_type_id, grade_from, grade_to, result_percentage, remarks)
  values ('${SEED.brighton}', ${YEAR}, (select id from public.academic_exam_types where code = 'gcse'), '9', '7', 50, 'old figure')`)

const dir = mkdtempSync(path.join(tmpdir(), 'aa-import-'))
const csvPath = path.join(dir, 'results.csv')
writeFileSync(csvPath, [
  'school,school_id,exam_year,exam_type,grade_from,grade_to,result_percent,remarks',
  `${brighton},,${YEAR},GCSE,9,7,81.5,updated figure`,
  `${brighton},,${YEAR},A Level,A*,A,60,`,
  `${sevenoaks},,${YEAR},IB,,,38,average points`,
  `Nowhere School,,${YEAR},GCSE,9,7,80,`,
].join('\n'))

const rowsFor = () => sql(`select count(*) from public.school_academic_results where exam_year = ${YEAR}`)

const browser = await launch()
try {
  const { page } = await signIn(browser, 'manager@aa.test')

  await step(page, 'the sample CSV downloads from the import drawer', async () => {
    const session = await page.createCDPSession()
    await session.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: dir })
    await open(page, '/schools')
    await click(page, 'Import exam results')
    await seeText(page, 'Download sample CSV', DIALOG)
    await pause(400)
    await click(page, 'Download sample CSV', DIALOG)
    let file = null
    for (let i = 0; i < 40 && !file; i++) { await pause(250); file = readdirSync(dir).find(f => f === 'school-exam-results-sample.csv') }
    assert(file, 'no sample downloaded')
    const sample = readFileSync(path.join(dir, file), 'utf8')
    assert(sample.startsWith('school,school_id,exam_year,exam_type,grade_from,grade_to,result_percent,remarks'), `sample header: ${sample.split('\n')[0]}`)
  })

  await step(page, 'an upload is previewed before anything is saved', async () => {
    const input = await page.$('input#results-csv')
    await input.uploadFile(csvPath)
    await seeText(page, '2 results to add and 1 to update, across 2 schools', DIALOG)
    await seeText(page, 'Line 5: No school is called "Nowhere School"', DIALOG)
    assert(rowsFor() === '1', `rows before importing: ${rowsFor()}`)
  })

  await step(page, 'importing adds and updates, skipping the line with a problem', async () => {
    await click(page, 'Import 3 results', DIALOG)
    await seeText(page, 'Imported: 2 added, 1 updated, 1 lines skipped')
    assert(rowsFor() === '3', `rows after importing: ${rowsFor()}`)
    const updated = sql(`select result_percentage || '|' || remarks from public.school_academic_results r join public.academic_exam_types t on t.id = r.exam_type_id
      where exam_year = ${YEAR} and t.code = 'gcse' and school_id = '${SEED.brighton}'`)
    assert(updated === '81.50|updated figure', `updated row: ${updated}`)
    const ib = sql(`select coalesce(grade_from, '-') || '|' || result_percentage from public.school_academic_results r join public.academic_exam_types t on t.id = r.exam_type_id
      where exam_year = ${YEAR} and t.code = 'ib'`)
    assert(ib === '-|38.00', `IB row: ${ib}`)
  })

  await step(page, 'uploading the same file again only updates', async () => {
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { polling: 100 })
    await open(page, `/schools/${SEED.brighton}?tab=academic-results`)
    await click(page, 'Import CSV')
    await page.waitForSelector('input#results-csv')
    await pause(400)
    await (await page.$('input#results-csv')).uploadFile(csvPath)
    await seeText(page, '0 results to add and 3 to update', DIALOG)
    await click(page, 'Import 3 results', DIALOG)
    await seeText(page, 'Imported: 0 added, 3 updated')
    assert(rowsFor() === '3', `rows after re-importing: ${rowsFor()}`)
  })
} finally {
  reset()
  await browser.close()
}
process.exit(summary() ? 1 : 0)
