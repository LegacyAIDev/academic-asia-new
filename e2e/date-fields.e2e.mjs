/**
 * End-to-end check of UAT DEV24-001: date-only fields keep the exact day picked,
 * through creation, reload and unrelated edits. Runs in Hong Kong time, where
 * converting a picked date to UTC used to move it one day back on every save.
 * Needs psql on PATH and E2E_DB_URL for the local test database.
 */
import { execFileSync } from 'node:child_process'
import { assert, choose, click, launch, open, seeText, signIn, step, summary } from './lib/harness.mjs'

const DB = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const DIALOG = '[role="dialog"]'
const POPOVER = '[data-slot="popover-content"]'
const sql = query => execFileSync('psql', [DB, '-X', '-A', '-t', '-q', '-c', query], { encoding: 'utf8' }).trim()
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))

const SURNAME = 'DATEDRIFT'
sql(`delete from public.students where surname = '${SURNAME}'`)

/** Clicks a day in the open date picker; the picker labels days in the browser's own date format. */
async function pickDay(page, year, month, day) {
  const label = await page.evaluate((y, m, d) => new Date(y, m - 1, d).toLocaleDateString(), year, month, day)
  const button = await page.waitForSelector(`${POPOVER} button[data-day="${label}"]`)
  await button.click()
  await page.waitForFunction(sel => !document.querySelector(sel), { polling: 100 }, POPOVER)
}

/** Sets the month and year dropdowns of an open date picker. */
async function showMonth(page, year, month) {
  await page.waitForSelector(`${POPOVER} select`)
  await page.$$eval(`${POPOVER} select`, (selects, y, m) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set
    for (const s of selects) {
      const isYear = [...s.options].some(o => o.value === String(y))
      setter.call(s, isYear ? String(y) : String(m - 1))
      s.dispatchEvent(new Event('change', { bubbles: true }))
    }
  }, year, month)
}

async function saveStudent(page, studentId) {
  await Promise.all([
    page.waitForFunction(id => location.pathname === `/students/${id}`, { polling: 100, timeout: 60000 }, studentId),
    click(page, 'Save Changes'),
  ])
}

async function saveApplication(page) {
  await click(page, 'Save Changes', DIALOG)
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { polling: 100, timeout: 60000 })
  await pause(500)
}

const browser = await launch()
try {
  const { page } = await signIn(browser, 'manager@aa.test')
  await page.emulateTimezone('Asia/Hong_Kong')
  let studentId, applicationId

  await step(page, 'a new student keeps the date of birth picked (15 Jan 2012)', async () => {
    await open(page, '/students/new')
    await page.type('#surname', SURNAME)
    await page.type('#first_name', 'Ava')
    await click(page, 'Select date')
    await showMonth(page, 2012, 1)
    await pickDay(page, 2012, 1, 15)
    await seeText(page, '15 Jan 2012')
    await Promise.all([
      page.waitForFunction(() => /^\/students\/[0-9a-f-]{36}$/.test(location.pathname), { polling: 100, timeout: 60000 }),
      click(page, 'Create Student'),
    ])
    studentId = page.url().split('/').pop()
    const saved = sql(`select date_of_birth from public.students where id = '${studentId}'`)
    assert(saved === '2012-01-15', `saved date of birth is ${saved}`)
  })

  await step(page, 'the editor reopens on the same date of birth', async () => {
    await open(page, `/students/${studentId}/edit`)
    await seeText(page, '15 Jan 2012')
  })

  await step(page, 'changing only the status leaves the date of birth alone', async () => {
    await choose(page, '#status_id', 'Active')
    await saveStudent(page, studentId)
    const row = sql(`select s.date_of_birth || ' ' || st.code from public.students s join public.student_statuses st on st.id = s.status_id where s.id = '${studentId}'`)
    assert(row === '2012-01-15 active', `after the status edit: ${row}`)
  })

  await step(page, 'a second unrelated edit still leaves it alone', async () => {
    await open(page, `/students/${studentId}/edit`)
    await page.type('#chinese_name', '艾娃')
    await saveStudent(page, studentId)
    const saved = sql(`select date_of_birth from public.students where id = '${studentId}'`)
    assert(saved === '2012-01-15', `after the second edit: ${saved}`)
    await open(page, `/students/${studentId}/edit`)
    await seeText(page, '15 Jan 2012')
  })

  const now = new Date(Date.now() + 8 * 3600000)
  const [year, month] = [now.getUTCFullYear(), now.getUTCMonth() + 1]
  const regDay = `${year}-${String(month).padStart(2, '0')}-05`

  await step(page, 'a new application keeps the registration date picked (single-digit day)', async () => {
    await open(page, `/students/${studentId}?tab=applications`)
    await click(page, 'New Application', '[role="tabpanel"]')
    await click(page, 'Select school', DIALOG)
    await click(page, 'Headington School')
    await page.waitForFunction(() => document.querySelectorAll('[role="dialog"] [role="combobox"][aria-expanded="true"]').length === 0, { polling: 100 })
    const regButton = await page.waitForFunction(() => {
      const label = [...document.querySelectorAll('[role="dialog"] label, [role="dialog"] span, [role="dialog"] p')].find(el => el.innerText.trim() === 'Reg. Date')
      return label?.parentElement?.querySelector('button') ?? null
    }, { polling: 100 })
    await regButton.asElement().click()
    await pickDay(page, year, month, 5)
    await click(page, 'Create Application', DIALOG)
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { polling: 100, timeout: 60000 })
    applicationId = sql(`select id from public.student_applications where student_id = '${studentId}'`)
    const saved = sql(`select registration_date from public.student_applications where id = '${applicationId}'`)
    assert(saved === regDay, `saved registration date is ${saved}, picked ${regDay}`)
  })

  await step(page, 'two unrelated application edits leave the registration date alone', async () => {
    for (const [field, value] of [['visit_remarks', 'Visit on a Saturday'], ['school_contact', 'Mrs Lee']]) {
      await open(page, `/students/${studentId}/applications/${applicationId}`)
      await click(page, 'Edit application')
      await page.waitForSelector(`${DIALOG} input[name="${field}"]`)
      await page.type(`${DIALOG} input[name="${field}"]`, value)
      await saveApplication(page)
      const row = sql(`select registration_date || ' | ' || coalesce(${field}, '') from public.student_applications where id = '${applicationId}'`)
      assert(row === `${regDay} | ${value}`, `after editing ${field}: ${row}`)
    }
  })
} finally {
  await browser.close()
}
process.exit(summary() ? 1 : 0)
