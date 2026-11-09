/**
 * End-to-end check of UAT DEV24-003: online examinations save, with and
 * without an application, and the booking form never refuses to save without
 * saying why. Group exams still need a room and say so before Save.
 * Needs psql on PATH and E2E_DB_URL for the local test database.
 */
import { execFileSync } from 'node:child_process'
import { assert, click, launch, open, seeText, signIn, step, summary } from './lib/harness.mjs'

const DB = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const DIALOG = '[role="dialog"]'
const sql = query => execFileSync('psql', [DB, '-X', '-A', '-t', '-q', '-c', query], { encoding: 'utf8' }).trim()
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))

sql(`delete from public.scheduler_bookings where title like 'UAT online%' or title like 'UAT group online%'`)

/** Opens the Select whose label reads `label` inside the dialog and picks an option. */
async function chooseByLabel(page, label, option) {
  const trigger = await page.waitForFunction((l) => {
    const labels = [...document.querySelectorAll('[role="dialog"] label')].filter(el => el.innerText.trim() === l)
    return labels.map(el => el.parentElement.querySelector('button[role="combobox"]')).find(Boolean) ?? null
  }, { polling: 100 }, label)
  await trigger.asElement().click()
  await click(page, option, '[data-slot="select-content"]')
  await page.waitForFunction(() => !document.querySelector('[data-slot="select-content"]'), { polling: 100 })
  await pause(300)
}

async function newExam(page, title, { online = true, student = true, application = false, start = '11:00', end = '11:45' } = {}) {
  await open(page, '/scheduler')
  await click(page, 'New booking')
  await page.waitForSelector(DIALOG)
  await chooseByLabel(page, 'Type', 'Examination')
  await page.$eval(`${DIALOG} input[name="title"]`, el => { el.value = '' })
  await page.type(`${DIALOG} input[name="title"]`, title)
  await chooseByLabel(page, 'Start (HKT)', start)
  await chooseByLabel(page, 'End (HKT)', end)
  if (online) {
    await page.click('#location-online')
    await page.waitForSelector('#online-link')
    await page.type('#online-link', 'https://meet.example.com/uat-exam')
  }
  if (student) {
    await click(page, 'Search students...', DIALOG)
    await page.waitForSelector('[cmdk-input]')
    await page.type('[cmdk-input]', 'Lucas')
    await click(page, 'Lucas Ng · S000123', '[cmdk-list]')
    await seeText(page, 'Lucas Ng', DIALOG)
  }
  if (application) await chooseByLabel(page, 'Application', 'Headington School (2027)')
}

async function save(page) {
  await click(page, 'Save', DIALOG)
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { polling: 100, timeout: 30000 })
}

const booking = title => sql(`select booking_type || '|' || location_type || '|' || coalesce(room_id::text, '-') || '|' || coalesce(online_link, '-') || '|' || coalesce(application_id::text, '-') || '|' || (student_id is not null) from public.scheduler_bookings where title = '${title}'`)

const browser = await launch()
try {
  const { page } = await signIn(browser, 'manager@aa.test')
  await page.emulateTimezone('Asia/Hong_Kong')
  const applicationId = sql(`select id from public.student_applications where student_id = (select id from public.students where student_code = 'S000123') limit 1`)

  await step(page, 'an online examination linked to an application saves once', async () => {
    await newExam(page, 'UAT online maths', { application: true })
    await save(page)
    const rows = booking('UAT online maths')
    assert(rows === `examination|online|-|https://meet.example.com/uat-exam|${applicationId}|true`, `saved: ${rows}`)
  })

  await step(page, 'an online examination for a student only saves once', async () => {
    await newExam(page, 'UAT online student only', { start: '14:45', end: '15:00' })
    await save(page)
    const rows = booking('UAT online student only')
    assert(rows === 'examination|online|-|https://meet.example.com/uat-exam|-|true', `saved: ${rows}`)
  })

  await step(page, 'both online exams show in the calendar and their details after reload', async () => {
    await open(page, '/scheduler')
    await seeText(page, 'UAT online maths')
    await seeText(page, 'UAT online student only')
    const event = await page.waitForFunction(() => [...document.querySelectorAll('[role=button]')].find(e => e.innerText?.includes('UAT online maths')) ?? null, { polling: 100 })
    await event.asElement().click()
    await seeText(page, 'https://meet.example.com/uat-exam')
    await seeText(page, 'Lucas Ng')
  })

  await step(page, 'a physical examination in a room still saves (control)', async () => {
    await newExam(page, 'UAT online control in room', { online: false, start: '17:00', end: '17:30' })
    const room = await page.waitForFunction(() => [...document.querySelectorAll('[aria-label="Available rooms"] [role="option"]')].find(o => o.innerText.includes('Exam Room')) ?? null, { polling: 100 })
    await room.asElement().click()
    await save(page)
    const rows = booking('UAT online control in room')
    assert(/^examination\|room\|[0-9a-f-]{36}\|-\|-\|true$/.test(rows), `saved: ${rows}`)
  })

  await step(page, 'a missing field is listed beside Save instead of failing silently', async () => {
    await newExam(page, 'UAT online no student', { student: false, start: '16:00', end: '16:30' })
    await click(page, 'Save', DIALOG)
    await seeText(page, "This booking can't be saved yet:", `${DIALOG} [role="alert"]`)
    await seeText(page, 'Select the student sitting the exam', `${DIALOG} [role="alert"]`)
    assert(sql(`select count(*) from public.scheduler_bookings where title = 'UAT online no student'`) === '0', 'nothing should be saved')
    await page.keyboard.press('Escape')
  })

  await step(page, 'a group exam offers no Online option and says it needs a room', async () => {
    await open(page, '/scheduler')
    await click(page, 'New booking')
    await page.waitForSelector(DIALOG)
    await chooseByLabel(page, 'Type', 'Group examination')
    assert(await page.$eval('#location-online', el => el.disabled), 'Online should be disabled for a group exam')
    await seeText(page, 'A group examination needs a room.', DIALOG)
    await page.keyboard.press('Escape')
  })
} finally {
  await browser.close()
}
process.exit(summary() ? 1 : 0)
