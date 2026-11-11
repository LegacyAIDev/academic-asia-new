/**
 * End-to-end check of UAT DEV24-004: an examination booked in the Scheduler
 * can be followed through the exam desk and All exams to completion, and each
 * candidate of a group exam has their own exam record in All exams.
 * Needs psql on PATH and E2E_DB_URL for the local test database.
 */
import { execFileSync } from 'node:child_process'
import { assert, click, hkDay, launch, open, seeText, signIn, step, summary } from './lib/harness.mjs'
import { newExam, openBookingFromCalendar, saveBooking } from './lib/booking-form.mjs'

const DB = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = query => execFileSync('psql', [DB, '-X', '-A', '-t', '-q', '-c', query], { encoding: 'utf8' }).trim()
const SHEET = '[role="dialog"]'
const TODAY = hkDay()
const ALL_EXAMS_TODAY = `/exams?view=all&from=${TODAY}&to=${TODAY}`

sql(`delete from public.scheduler_bookings where title like 'UAT complete%'`)
sql(`delete from public.student_individual_exams where subject like 'UAT complete%'`)

const examOf = title => sql(`select e.subject || '|' || e.status_id || '|' || e.confirmed_date || '|' || coalesce(e.room, '-') from public.scheduler_bookings b join public.student_individual_exams e on e.id = b.exam_id where b.title = '${title}'`)

async function waitFor(check, message, timeout = 20000) {
  for (const end = Date.now() + timeout; Date.now() < end; await new Promise(resolve => setTimeout(resolve, 250))) {
    if (check()) return
  }
  throw new Error(message)
}

/** The All exams row for a subject, as visible text. */
const rowText = (page, subject) => page.evaluate(s => [...document.querySelectorAll('tbody tr')].map(r => r.innerText.replace(/\s+/g, ' ')).filter(t => t.includes(s)), subject)

const browser = await launch()
try {
  const { page } = await signIn(browser, 'manager@aa.test')
  await page.emulateTimezone('Asia/Hong_Kong')

  await step(page, 'an exam booked in the Scheduler gets an exam record', async () => {
    await newExam(page, 'UAT complete physics', { online: false, start: '09:00', end: '09:45' })
    await saveBooking(page)
    const exam = examOf('UAT complete physics')
    assert(exam === `UAT complete physics|1|${TODAY}|Exam Room`, `exam record: ${exam}`)
  })

  await step(page, 'it is on the exam desk and in All exams for its date', async () => {
    await open(page, '/exams')
    await seeText(page, '09:00–09:45 Lucas Ng')
    await open(page, ALL_EXAMS_TODAY)
    const rows = await rowText(page, 'UAT complete physics')
    assert(rows.length === 1 && rows[0].includes('Lucas Ng') && rows[0].includes('To schedule'), `All exams: ${rows}`)
  })

  await step(page, 'the booking says how to complete it and links to All exams', async () => {
    await openBookingFromCalendar(page, 'UAT complete physics')
    await seeText(page, 'Showed up completes the exam in All exams', SHEET)
    await seeText(page, 'exam pending', SHEET)
    const href = await page.$eval(`${SHEET} a[href*="view=all"]`, a => a.getAttribute('href'))
    assert(href === ALL_EXAMS_TODAY, `link: ${href}`)
  })

  await step(page, 'confirming, then Showed up, completes the exam record', async () => {
    for (const [button, status] of [['Confirm', '2'], ['Showed up', '3']]) {
      await openBookingFromCalendar(page, 'UAT complete physics')
      await seeText(page, 'Created', SHEET)
      await new Promise(resolve => setTimeout(resolve, 600))
      await click(page, button, SHEET)
      await waitFor(() => examOf('UAT complete physics').split('|')[1] === status, `${button}: ${examOf('UAT complete physics')}`)
    }
  })

  await step(page, 'after reload All exams shows it completed, and the booking history names who confirmed it', async () => {
    await open(page, ALL_EXAMS_TODAY)
    const rows = await rowText(page, 'UAT complete physics')
    assert(rows.length === 1 && rows[0].includes('Completed'), `All exams: ${rows}`)
    await openBookingFromCalendar(page, 'UAT complete physics')
    await seeText(page, 'exam completed', SHEET)
    await seeText(page, 'Confirmed', SHEET)
    await seeText(page, 'Maggie Manager', SHEET)
  })

  await step(page, 'each candidate of a group exam has their own record in All exams', async () => {
    const manager = sql(`select id from auth.users where email = 'manager@aa.test'`)
    sql(`select set_config('request.jwt.claims', '{"sub":"${manager}","role":"authenticated"}', false); select public.scheduler_save_booking(jsonb_build_object(
      'title','UAT complete group','booking_type','group_examination','start_at','${TODAY}T02:00:00Z','end_at','${TODAY}T03:00:00Z',
      'location_type','room','room_id',(select id from public.scheduler_rooms where display_name = 'Exam Room'),'seats_required',2),
      jsonb_build_array(
        jsonb_build_object('student_id',(select id from public.students where student_code = 'S000123'),'role','candidate','seat_no',1),
        jsonb_build_object('student_id',(select id from public.students where surname = 'DATEDRIFT' limit 1),'role','candidate','seat_no',2)))`)
    await open(page, ALL_EXAMS_TODAY)
    const rows = await rowText(page, 'UAT complete group')
    assert(rows.length === 2, `group rows: ${rows.length}`)
    assert(rows.some(r => r.includes('Lucas Ng')) && rows.some(r => r.includes('Ava DATEDRIFT')), `group rows: ${rows}`)
  })
} finally {
  await browser.close()
}
process.exit(summary() ? 1 : 0)
