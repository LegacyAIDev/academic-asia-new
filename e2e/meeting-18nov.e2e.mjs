/**
 * End-to-end check of the changes from the 18 Nov meeting with Jack: the
 * Tutoring & exams tab is hidden and the student calendar offers "Booking"; a
 * booking can be saved without a title and is named from its type; every new
 * student starts as an Enquiry, which has its own tab; and the exam team can
 * attach a student's own exam document (an online test's access code) on the
 * exam desk, which nobody else sees.
 * Needs psql on PATH and E2E_DB_URL for the local test database.
 */
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { assert, click, hkDay, launch, notSeeText, open, SEED, seeText, signIn, step, summary } from './lib/harness.mjs'
import { chooseByLabel } from './lib/booking-form.mjs'

const DB = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = query => execFileSync('psql', [DB, '-X', '-A', '-t', '-q', '-c', query], { encoding: 'utf8' }).trim()
const FIX = process.env.E2E_FIXTURES ?? '/tmp/aa-localdb/fixtures'
const DIALOG = '[role="dialog"]'
const MENU = '[role="menu"]'
const DAY = hkDay(5)
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))

function reset() {
  sql(`delete from public.scheduler_bookings where title like 'UAT m18%' or (booking_type = 'internal_meeting' and title like 'Internal meeting%' and notes = 'UAT m18')`)
  sql(`delete from public.student_documents where attachable_type = 'student_individual_exams'`)
  sql(`delete from public.students where surname = 'M18TEST'`)
}
reset()

// An examination for Lucas on DAY, booked and confirmed the way the Scheduler does.
const LUCAS = `(select id from public.students where student_code = 'S000123' limit 1)`
const manager = sql(`select id from auth.users where email = 'manager@aa.test'`)
sql(`select set_config('request.jwt.claims', '{"sub":"${manager}","role":"authenticated"}', false);
  select public.scheduler_confirm_booking(public.scheduler_save_booking(jsonb_build_object(
    'title', 'UAT m18 online test', 'booking_type', 'examination', 'start_at', '${DAY}T02:00:00Z', 'end_at', '${DAY}T03:00:00Z',
    'location_type', 'room', 'room_id', (select id from public.scheduler_rooms where display_name = 'Exam Room'), 'seats_required', 1, 'student_id', ${LUCAS}),
    jsonb_build_array(jsonb_build_object('student_id', ${LUCAS}, 'role', 'candidate', 'seat_no', 1))))`)

const browser = await launch()
try {
  const { page } = await signIn(browser, 'manager@aa.test')

  await step(page, 'the student page hides Tutoring & exams, and the calendar offers Booking', async () => {
    await open(page, `/students/${SEED.student}?tab=calendar`)
    const tabs = await page.$$eval('nav a', links => links.map(a => a.innerText.trim()))
    assert(!tabs.some(t => t.startsWith('Tutoring')), `tabs: ${tabs.join(', ')}`)
    await seeText(page, 'Booking', 'main')
    await notSeeText(page, 'Book consultation')
  })

  await step(page, 'a booking saved without a title is named from its type', async () => {
    await open(page, '/scheduler')
    await click(page, 'New booking')
    await page.waitForSelector(DIALOG)
    await pause(500)
    await chooseByLabel(page, 'Type', 'Internal meeting')
    await page.click('#location-online')
    await page.waitForSelector('#online-link')
    await page.type('#online-link', 'https://meet.example.com/m18')
    await page.type(`${DIALOG} textarea[name="notes"]`, 'UAT m18')
    await click(page, 'Save', DIALOG)
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { polling: 100, timeout: 30000 })
    const title = sql(`select title from public.scheduler_bookings where notes = 'UAT m18'`)
    assert(title === 'Internal meeting · Online', `title: ${title}`)
  })

  await step(page, 'Enquiry is the first status tab, and a new student starts there', async () => {
    await open(page, '/students')
    const tabs = await page.$$eval('main [role="tab"], main nav a', els => els.map(e => e.innerText.replace(/\s+/g, ' ').trim()))
    const enquiry = tabs.findIndex(t => t.startsWith('Enquiry'))
    assert(enquiry >= 0 && enquiry < tabs.findIndex(t => t.startsWith('New')), `tabs: ${tabs.join(' | ')}`)
    await open(page, '/students?add=student')
    await page.waitForSelector(`${DIALOG} input[name="surname"]`)
    await pause(600)
    await page.type(`${DIALOG} input[name="first_name"]`, 'Ella')
    await page.type(`${DIALOG} input[name="surname"]`, 'M18TEST')
    await Promise.all([
      page.waitForFunction(() => /^\/students\/[0-9a-f-]{36}$/.test(location.pathname), { polling: 100, timeout: 60000 }),
      click(page, 'Create Student', DIALOG),
    ])
    const status = sql(`select st.code from public.students s join public.student_statuses st on st.id = s.status_id where s.surname = 'M18TEST'`)
    assert(status === 'enquiry', `status: ${status}`)
    await seeText(page, 'Enquiry')
  })

  await step(page, 'the exam team attaches a student\'s access document on the exam desk', async () => {
    await open(page, `/exams?from=${DAY}&to=${DAY}`)
    const row = await page.waitForFunction(() => [...document.querySelectorAll('tbody tr')].find(r => r.innerText.includes('Lucas Ng')) ?? null, { polling: 100 })
    await (await row.asElement().$('button[aria-label="More actions"]')).click()
    await click(page, 'Add access document', MENU)
    await seeText(page, 'Access document', DIALOG)
    const input = await page.waitForSelector(`${DIALOG} input[type="file"]:not([aria-label])`)
    await input.uploadFile(path.join(FIX, 'english-v1.pdf'))
    await seeText(page, 'english-v1.pdf', DIALOG)
    assert(sql(`select count(*) from public.student_documents where attachable_type = 'student_individual_exams'`) === '1', 'document not stored')
    await page.keyboard.press('Escape')
    await page.waitForSelector('tbody button[aria-label="Access document"]')
  })

  await step(page, 'it stays out of the student\'s Documents tab', async () => {
    await open(page, `/students/${SEED.student}?tab=documents`)
    await page.waitForSelector('main')
    await notSeeText(page, 'english-v1.pdf')
  })

  const staff = (await signIn(browser, 'staff@aa.test')).page
  await step(staff, 'staff outside the exam team are not offered it', async () => {
    await open(staff, `/exams?from=${DAY}&to=${DAY}`)
    await seeText(staff, 'Lucas Ng')
    assert(!(await staff.$('tbody button[aria-label="Access document"]')), 'the access document is shown to staff')
  })
} finally {
  reset()
  await browser.close()
}
process.exit(summary() ? 1 : 0)
