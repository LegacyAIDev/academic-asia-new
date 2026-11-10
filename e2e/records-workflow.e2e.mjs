/**
 * End-to-end check of school and student records and the document exports:
 * create, edit and delete a school (with boarder ages), delete a student, and
 * download the school PDF, the brief intro PDF and spreadsheet, and an exam
 * cover slip. Needs psql on PATH and E2E_DB_URL for the local test database.
 */
import { execFileSync } from 'node:child_process'
import { assert, click, launch, open, SEED, seeText, signIn, step, summary } from './lib/harness.mjs'

const DB = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = query => execFileSync('psql', [DB, '-X', '-A', '-t', '-q', '-c', query], { encoding: 'utf8' }).trim()
const pause = ms => new Promise(r => setTimeout(r, ms))

sql(`delete from public.schools where name like 'UAT School%'`)
sql(`delete from public.students where surname = 'DELETEME'`)

/** Calls an export endpoint with the signed-in session and reports status, type and size. */
const download = (page, url, body) => page.evaluate(async (u, b) => {
  const res = await fetch(u, b ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) } : {})
  const blob = await res.blob()
  return { status: res.status, type: res.headers.get('content-type') ?? '', size: blob.size }
}, url, body ?? null)

async function confirmDelete(page, title) {
  await click(page, title, 'main')
  await page.waitForSelector('[role="alertdialog"]')
  await pause(400)
  await click(page, title.replace('Delete ', 'Delete '), '[role="alertdialog"]').catch(() =>
    page.evaluate(() => [...document.querySelectorAll('[role="alertdialog"] button')].pop().click()))
}

const browser = await launch()
try {
  const { page } = await signIn(browser, 'manager@aa.test')
  let schoolId = null

  await step(page, 'a new school saves with its boarder ages', async () => {
    await open(page, '/schools/new')
    await page.type('input[name="name"]', 'UAT School Riverside')
    await page.type('#boarder_age_min', '11')
    await page.type('#boarder_age_max', '17')
    await Promise.all([
      page.waitForFunction(() => /^\/schools\/[0-9a-f-]{36}$/.test(location.pathname), { polling: 100, timeout: 60000 }),
      page.click('main button[type="submit"]'),
    ])
    schoolId = page.url().split('/').pop()
    await seeText(page, 'UAT School Riverside')
    assert(sql(`select boarder_age_min || '-' || boarder_age_max from public.schools where id = '${schoolId}'`) === '11-17', 'boarder ages not saved')
  })

  await step(page, 'editing the school keeps its changes', async () => {
    await open(page, `/schools/${schoolId}/edit`)
    await page.$eval('#boarder_age_max', el => el.select())
    await page.keyboard.press('Backspace')
    await page.type('#boarder_age_max', '18')
    await Promise.all([
      page.waitForFunction(id => location.pathname === `/schools/${id}`, { polling: 100, timeout: 60000 }, schoolId),
      page.click('main button[type="submit"]'),
    ])
    assert(sql(`select boarder_age_min || '-' || boarder_age_max from public.schools where id = '${schoolId}'`) === '11-18', 'edit not saved')
  })

  await step(page, 'the school can be deleted', async () => {
    await open(page, `/schools/${schoolId}`)
    await confirmDelete(page, 'Delete School')
    await page.waitForFunction(() => location.pathname === '/schools', { polling: 100, timeout: 60000 })
    assert(sql(`select count(*) from public.schools where id = '${schoolId}'`) === '0', 'school still in the database')
  })

  await step(page, 'a student can be deleted', async () => {
    const id = sql(`insert into public.students (surname, first_name, student_code) values ('DELETEME', 'Tmp', 'S0DELME') returning id`).split('\n')[0]
    await open(page, `/students/${id}`)
    await confirmDelete(page, 'Delete Student')
    await page.waitForFunction(() => location.pathname === '/students', { polling: 100, timeout: 60000 })
    assert(sql(`select count(*) from public.students where id = '${id}'`) === '0', 'student still in the database')
  })

  await step(page, 'the selected-schools PDF downloads', async () => {
    await open(page, `/schools/export?ids=${SEED.headington},${SEED.brighton}`)
    const pdf = await download(page, '/api/schools/export/pdf', { ids: [SEED.headington, SEED.brighton], layout: 'matrix', student: 'Lucas Ng' })
    assert(pdf.status === 200 && pdf.type.includes('pdf') && pdf.size > 1000, JSON.stringify(pdf))
  })

  await step(page, 'brief intros download as PDF and spreadsheet', async () => {
    const pdf = await download(page, '/api/students/brief-intro/export/pdf', { ids: [SEED.student] })
    const xlsx = await download(page, '/api/students/brief-intro/export/xlsx', { ids: [SEED.student] })
    assert(pdf.status === 200 && pdf.size > 500, `pdf ${JSON.stringify(pdf)}`)
    assert(xlsx.status === 200 && xlsx.size > 500, `xlsx ${JSON.stringify(xlsx)}`)
  })

  await step(page, 'an exam cover slip downloads', async () => {
    const booking = sql(`select id from public.scheduler_bookings where booking_type = 'examination' and status <> 'cancelled' order by created_at limit 1`)
    const slip = await download(page, `/api/exams/cover-slip/pdf?booking=${booking}`)
    assert(slip.status === 200 && slip.type.includes('pdf') && slip.size > 1000, JSON.stringify(slip))
  })
} finally {
  await browser.close()
}
process.exit(summary() ? 1 : 0)
