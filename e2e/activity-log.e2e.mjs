/**
 * End-to-end check of the activity history (meeting note 18, SEC-06, STU-14):
 * actions carried out in the app, and writes made directly in the database,
 * are recorded with what happened, when and by whom, and shown read-only on
 * the student, application and school pages.
 * Needs psql on PATH and E2E_DB_URL for the local test database.
 */
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { choose, click, launch, notSeeText, open, SEED, seeText, shot, signIn, step, summary } from './lib/harness.mjs'

const DB = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const FIX = process.env.E2E_FIXTURES ?? '/tmp/aa-localdb/fixtures'
const DIALOG = '[role="dialog"]'
const ACTIVITY = 'ol[aria-label="Activity"]'
const sql = query => execFileSync('psql', [DB, '-X', '-A', '-t', '-q', '-c', query], { encoding: 'utf8' }).trim()

const browser = await launch()
try {
  const { page } = await signIn(browser, 'staff@aa.test')
  page.on('dialog', d => d.accept())

  await step(page, 'filing an email is recorded under the staff member who did it', async () => {
    await open(page, `/students/${SEED.student}?tab=communications`)
    await click(page, 'File email')
    const input = await page.waitForSelector(`${DIALOG} input[type="file"]`)
    await input.uploadFile(path.join(FIX, 'offer.eml'))
    await page.waitForFunction(() => document.querySelector('[role="dialog"] input[id$="-subject"]')?.value === 'Year 9 entry – confirmed', { polling: 100 })
    await choose(page, `${DIALOG} button[id$="-application"]`, 'Headington School · 2027 entry')
    await click(page, 'File email', DIALOG)
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { polling: 100 })
    await open(page, `/students/${SEED.student}?tab=overview`)
    await seeText(page, 'Created email · Year 9 entry – confirmed', ACTIVITY)
    await seeText(page, 'Sam Staff', ACTIVITY)
  })

  await step(page, 'an edit is recorded with the field that changed', async () => {
    await open(page, `/students/${SEED.student}?tab=communications`)
    await click(page, 'Year 9 entry – confirmed', 'table')
    await click(page, 'Archive', DIALOG)
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { polling: 100 })
    await open(page, `/students/${SEED.student}?tab=overview`)
    await seeText(page, 'Updated email: archived · Year 9 entry – confirmed', ACTIVITY)
  })

  await step(page, 'creating an exam is attributed to the person who created it (meeting note 18 example)', async () => {
    const staffId = sql(`select id from auth.users where email = 'staff@aa.test'`)
    sql(`begin; set local role authenticated; set local request.jwt.claims = '{"sub":"${staffId}","role":"authenticated"}';
         insert into public.student_individual_exams (student_id, exam_type_id, title, school_id, application_id)
         values ('${SEED.student}', 2, 'Headington Year 9 entrance exam', '${SEED.headington}', '${SEED.application}'); commit;`)
    await open(page, `/students/${SEED.student}?tab=overview`)
    await seeText(page, 'Created exam · Headington Year 9 entrance exam', ACTIVITY)
    await shot(page, 'activity-01-student-overview')
  })

  await step(page, 'a write without a signed-in user shows as System', async () => {
    sql(`update public.students set remarks = 'Imported note ${Date.now()}' where id = '${SEED.student}'`)
    await open(page, `/students/${SEED.student}?tab=overview`)
    await seeText(page, 'Updated student record: remarks', ACTIVITY)
    await seeText(page, 'System ·', ACTIVITY)
  })

  await step(page, 'the application page shows the history of that application only', async () => {
    await open(page, `/students/${SEED.student}/applications/${SEED.application}`)
    // Every change is folded under the History panel's dated milestones.
    await page.evaluate(() => [...document.querySelectorAll('summary')].find(s => s.innerText.includes('Show every change')).click())
    await seeText(page, 'Created exam · Headington Year 9 entrance exam', ACTIVITY)
    await seeText(page, 'Created email · Year 9 entry – confirmed', ACTIVITY)
    await notSeeText(page, 'Updated student record', ACTIVITY)
  })

  await step(page, 'the school page shows what was filed or created for the school', async () => {
    await open(page, `/schools/${SEED.headington}?tab=notes`)
    await seeText(page, 'Created exam · Headington Year 9 entrance exam', ACTIVITY)
    await seeText(page, 'Created email · Year 9 entry – confirmed', ACTIVITY)
  })

  // ---- A deletion keeps its history ----
  const manager = (await signIn(browser, 'manager@aa.test')).page
  manager.on('dialog', d => d.accept())
  await step(manager, 'deleting a record is recorded and its earlier history is kept', async () => {
    await open(manager, `/students/${SEED.student}?tab=communications`)
    await manager.click('#emails-archived')
    await click(manager, 'Year 9 entry – confirmed', 'table')
    await click(manager, 'Delete for good', DIALOG)
    await click(manager, 'Delete', '[role="alertdialog"]')
    await manager.waitForFunction(() => !document.querySelector('table')?.innerText.includes('Year 9 entry'), { polling: 100 })
    await open(manager, `/students/${SEED.student}?tab=overview`)
    await seeText(manager, 'Deleted email · Year 9 entry – confirmed', ACTIVITY)
    await seeText(manager, 'Maggie Manager', ACTIVITY)
    await seeText(manager, 'Created email · Year 9 entry – confirmed', ACTIVITY)
  })

  // ---- Read-only for everyone ----
  const junior = (await signIn(browser, 'junior@aa.test')).page
  await step(junior, 'read-only staff see the history, which offers nothing to edit', async () => {
    await open(junior, `/students/${SEED.student}?tab=overview`)
    await seeText(junior, 'Deleted email · Year 9 entry – confirmed', ACTIVITY)
    const controls = await junior.$$eval(`${ACTIVITY} button, ${ACTIVITY} input`, els => els.length)
    if (controls !== 0) throw new Error(`activity list has ${controls} controls`)
  })

  await step(junior, 'nobody can change the history through the API, not even its own entries', async () => {
    const juniorId = sql(`select id from auth.users where email = 'junior@aa.test'`)
    const attempt = (statement) => {
      try {
        sql(`begin; set local role authenticated; set local request.jwt.claims = '{"sub":"${juniorId}","role":"authenticated"}'; ${statement}; commit;`)
        return 'allowed'
      } catch (err) {
        return /permission denied/.test(String(err.stderr ?? err.message)) ? 'denied' : String(err.message)
      }
    }
    const results = [
      attempt(`delete from public.activity_log`),
      attempt(`update public.activity_log set label = 'tampered'`),
      attempt(`insert into public.activity_log (action, entity, entity_id) values ('created', 'students', 'x')`),
    ]
    if (results.some(r => r !== 'denied')) throw new Error(`expected every change refused, got ${results.join(', ')}`)
  })
} finally {
  await browser.close()
}
process.exit(summary() ? 1 : 0)
