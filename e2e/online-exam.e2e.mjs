/**
 * End-to-end check of UAT DEV24-003: online examinations save, with and
 * without an application, and the booking form never refuses to save without
 * saying why. Group exams still need a room and say so before Save.
 * Needs psql on PATH and E2E_DB_URL for the local test database.
 */
import { execFileSync } from 'node:child_process'
import { assert, click, launch, open, seeText, signIn, step, summary } from './lib/harness.mjs'
import { chooseByLabel, DIALOG, newExam, openBookingFromCalendar, saveBooking as save } from './lib/booking-form.mjs'

const DB = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = query => execFileSync('psql', [DB, '-X', '-A', '-t', '-q', '-c', query], { encoding: 'utf8' }).trim()

sql(`delete from public.scheduler_bookings where title like 'UAT online%'`)
sql(`delete from public.student_individual_exams where subject like 'UAT online%'`)

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
    await seeText(page, 'UAT online student only')
    await openBookingFromCalendar(page, 'UAT online maths')
    await seeText(page, 'https://meet.example.com/uat-exam')
    await seeText(page, 'Lucas Ng')
  })

  await step(page, 'a physical examination in a room still saves (control)', async () => {
    await newExam(page, 'UAT online control in room', { online: false, start: '17:00', end: '17:30' })
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
