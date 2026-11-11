/**
 * End-to-end check of the Exams pages in the new style: the desk row keeps its
 * actions on one line (notes, and print once papers are chosen, as icons, the rest under "More"), the
 * All exams tabs carry their counts, a score saves from the list, and a date
 * with nothing booked shows a plain empty state.
 * Needs psql on PATH and E2E_DB_URL for the local test database.
 */
import { execFileSync } from 'node:child_process'
import { assert, click, hkDay, launch, open, seeText, setValue, signIn, step, summary } from './lib/harness.mjs'

const DB = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = query => execFileSync('psql', [DB, '-X', '-A', '-t', '-q', '-c', query], { encoding: 'utf8' }).trim()
const DAY = hkDay(3)
const DESK = `/exams?from=${DAY}&to=${DAY}`
const ALL = `/exams?view=all&from=${DAY}&to=${DAY}`
const MENU = '[role="menu"]'
const DIALOG = '[role="dialog"]'

sql(`delete from public.scheduler_bookings where title like 'UAT exams page%'`)
sql(`delete from public.student_individual_exams where subject like 'UAT exams page%'`)

const LUCAS = `(select id from public.students where student_code = 'S000123' limit 1)`
const ROOM = `(select id from public.scheduler_rooms where display_name = 'Exam Room')`
const manager = sql(`select id from auth.users where email = 'manager@aa.test'`)
sql(`select set_config('request.jwt.claims', '{"sub":"${manager}","role":"authenticated"}', false);
  select public.scheduler_confirm_booking(public.scheduler_save_booking(jsonb_build_object(
    'title', 'UAT exams page maths', 'booking_type', 'examination', 'start_at', '${DAY}T02:00:00Z', 'end_at', '${DAY}T03:00:00Z',
    'location_type', 'room', 'room_id', ${ROOM}, 'seats_required', 1, 'student_id', ${LUCAS}),
    jsonb_build_array(jsonb_build_object('student_id', ${LUCAS}, 'role', 'candidate', 'seat_no', 1))))`)
sql(`update public.student_individual_exams set subject = 'UAT exams page maths'
  where id = (select a.exam_id from public.scheduler_booking_attendees a join public.scheduler_bookings b on b.id = a.booking_id
  where b.title = 'UAT exams page maths' limit 1)`)

const scoreOf = () => sql(`select coalesce(score::text, '-') from public.student_individual_exams where subject = 'UAT exams page maths'`)
const rowText = (page, text) => page.evaluate(t => [...document.querySelectorAll('tbody tr')].map(r => r.innerText.replace(/\s+/g, ' ')).filter(s => s.includes(t)), text)

const browser = await launch()
try {
  const { page } = await signIn(browser, 'manager@aa.test')
  await page.emulateTimezone('Asia/Hong_Kong')

  await step(page, 'the desk row shows the booking with its actions on one line', async () => {
    await open(page, DESK)
    await seeText(page, '10:00–11:00 Lucas Ng')
    const row = await page.evaluateHandle(() => [...document.querySelectorAll('tbody tr')].find(r => r.innerText.includes('Lucas Ng')))
    const labels = await row.evaluate(r => [...r.querySelectorAll('button')].map(b => b.getAttribute('aria-label') || b.innerText.trim()))
    assert(labels.includes('Notes') && labels.includes('More actions') && !labels.includes('Print the papers'), `row buttons: ${labels}`)
    const tops = await row.evaluate(r => [...r.lastElementChild.querySelectorAll('button')].map(b => Math.round(b.getBoundingClientRect().top)))
    assert(new Set(tops).size === 1, `actions wrap onto ${new Set(tops).size} lines`)
  })

  await step(page, 'the More menu holds the cover slip and the booking', async () => {
    await page.click('tbody tr button[aria-label="More actions"]')
    await seeText(page, 'Cover slip', MENU)
    await seeText(page, 'Open booking', MENU)
  })

  await step(page, 'Open booking shows the booking in a drawer with its next step', async () => {
    await click(page, 'Open booking', MENU)
    await seeText(page, 'UAT exams page maths', DIALOG)
    await seeText(page, 'Showed up', DIALOG)
    await seeText(page, 'Open full page', DIALOG)
    assert(page.url().includes('/exams'), `left the exam desk: ${page.url()}`)
    await page.keyboard.press('Escape')
  })

  await step(page, 'the full booking page offers the same next step', async () => {
    const id = sql(`select id from public.scheduler_bookings where title = 'UAT exams page maths'`)
    await open(page, `/scheduler/bookings/${id}`)
    await seeText(page, 'Showed up')
    await seeText(page, 'History')
  })

  await step(page, 'All exams shows counts on its tabs and no stat cards', async () => {
    await open(page, ALL)
    const tabs = await page.$$eval('nav[aria-label="Exam status"] a', as => as.map(a => a.innerText.replace(/\s+/g, ' ')))
    assert(tabs.length === 4 && tabs.every(t => /\d/.test(t)), `tabs: ${tabs}`)
    assert(tabs[1].startsWith('To schedule'), `second tab: ${tabs[1]}`)
    const rows = await rowText(page, 'UAT exams page maths')
    assert(rows.length === 1 && rows[0].includes('Confirmed') && rows[0].includes('Exam Room'), `row: ${rows}`)
  })

  await step(page, 'a score typed in the list is saved', async () => {
    await page.focus('tbody input[aria-label="Score"]')
    await setValue(page, 'tbody input[aria-label="Score"]', '87')
    await page.click('h1')
    await seeText(page, 'Score saved')
    const deadline = Date.now() + 5000
    while (Number(scoreOf()) !== 87 && Date.now() < deadline) await new Promise(r => setTimeout(r, 200))
    assert(Number(scoreOf()) === 87, `score: ${scoreOf()}`)
  })

  await step(page, 'a date with nothing booked says so in plain words', async () => {
    const empty = hkDay(400)
    await open(page, `/exams?view=all&from=${empty}&to=${empty}`)
    await seeText(page, 'No exams here')
    await seeText(page, 'Clear the dates to see every exam')
  })

  await step(page, 'clicking Clear filters on the desk resets the dates', async () => {
    await open(page, DESK)
    await click(page, 'Clear filters')
    await page.waitForFunction(() => !location.search.includes('from='), { timeout: 10000 })
  })
} finally {
  sql(`delete from public.scheduler_bookings where title like 'UAT exams page%'`)
  sql(`delete from public.student_individual_exams where subject like 'UAT exams page%'`)
  await browser.close()
}
summary()
