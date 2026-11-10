/**
 * End-to-end check of UAT DEV24-005: the exam desk counts and marks attendance
 * per candidate. One individual exam (Ava) plus a two-candidate group (Lucas,
 * Leo) is three people waiting; each group candidate gets their own Showed up
 * or No show, and Showed up completes that candidate's exam record.
 * Needs psql on PATH and E2E_DB_URL for the local test database.
 */
import { execFileSync } from 'node:child_process'
import { assert, hkDay, launch, open, seeText, signIn, step, summary } from './lib/harness.mjs'

const DB = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = query => execFileSync('psql', [DB, '-X', '-A', '-t', '-q', '-c', query], { encoding: 'utf8' }).trim()
const DAY = hkDay(2)
const DESK = `/exams?from=${DAY}&to=${DAY}`
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))

sql(`delete from public.scheduler_bookings where title like 'UAT attend%'`)
sql(`delete from public.student_individual_exams where subject like 'UAT attend%'`)

const student = where => `(select id from public.students where ${where} limit 1)`
const AVA = student(`surname = 'DATEDRIFT'`), LUCAS = student(`student_code = 'S000123'`), LEO = student(`surname = 'STALETEST'`)
const ROOM = `(select id from public.scheduler_rooms where display_name = 'Exam Room')`

/** Books and confirms exams as the manager, the way the Scheduler does. */
function bookConfirmed(title, type, startHour, candidates) {
  const manager = sql(`select id from auth.users where email = 'manager@aa.test'`)
  const attendees = candidates.map((c, i) => `jsonb_build_object('student_id', ${c}, 'role', 'candidate', 'seat_no', ${i + 1})`).join(', ')
  const single = type === 'examination' ? `, 'student_id', ${candidates[0]}` : ''
  sql(`select set_config('request.jwt.claims', '{"sub":"${manager}","role":"authenticated"}', false);
    select public.scheduler_confirm_booking(public.scheduler_save_booking(jsonb_build_object(
      'title', '${title}', 'booking_type', '${type}', 'start_at', '${DAY}T0${startHour - 8}:00:00Z', 'end_at', '${DAY}T0${startHour - 7}:00:00Z',
      'location_type', 'room', 'room_id', ${ROOM}, 'seats_required', ${candidates.length}${single}),
      jsonb_build_array(${attendees})))`)
}

const attendanceOf = who => sql(`select coalesce(a.attendance, '-') || '|' || e.status_id from public.scheduler_booking_attendees a
  join public.scheduler_bookings b on b.id = a.booking_id join public.student_individual_exams e on e.id = a.exam_id
  where b.title like 'UAT attend%' and a.student_id = ${who}`)

/** Clicks a button in the desk row of the named student. */
async function rowButton(page, name, label) {
  const button = await page.waitForFunction((n, l) => {
    const row = [...document.querySelectorAll('tbody tr')].find(r => r.innerText.includes(n))
    return [...(row?.querySelectorAll('button') ?? [])].find(b => b.innerText.trim() === l && !b.disabled) ?? null
  }, { polling: 100 }, name, label)
  await button.asElement().click()
}

const counters = page => page.evaluate(() => {
  const text = document.body.innerText
  return [text.match(/(\d+) waiting/)?.[1], text.match(/(\d+) present/)?.[1]].join('/')
})

const browser = await launch()
try {
  const { page } = await signIn(browser, 'manager@aa.test')
  await page.emulateTimezone('Asia/Hong_Kong')
  bookConfirmed('UAT attend individual', 'examination', 9, [AVA])
  bookConfirmed('UAT attend group', 'group_examination', 10, [LUCAS, LEO])

  await step(page, 'one individual exam and a group of two count as three people waiting', async () => {
    await open(page, DESK)
    await seeText(page, '3 waiting')
    for (const name of ['Ava DATEDRIFT', 'Lucas Ng', 'Leo STALETEST']) await seeText(page, name, 'tbody')
    assert(await counters(page) === '3/0', `counters ${await counters(page)}`)
  })

  await step(page, 'after Ava arrives, two are still waiting', async () => {
    await rowButton(page, 'Ava DATEDRIFT', 'Showed up')
    await seeText(page, '2 waiting')
    assert(await counters(page) === '2/1', `counters ${await counters(page)}`)
  })

  await step(page, 'the two group candidates get different outcomes', async () => {
    await rowButton(page, 'Lucas Ng', 'Showed up')
    await seeText(page, '1 waiting')
    await pause(500)
    await rowButton(page, 'Leo STALETEST', 'No show')
    await seeText(page, '0 waiting')
    assert(attendanceOf(LUCAS) === 'show_up|3', `Lucas ${attendanceOf(LUCAS)}`)
    assert(attendanceOf(LEO) === 'no_show|2', `Leo ${attendanceOf(LEO)}`)
    assert(attendanceOf(AVA) === 'show_up|3', `Ava ${attendanceOf(AVA)}`)
  })

  await step(page, 'after reload the desk keeps each outcome; Leo can still be marked late', async () => {
    await open(page, DESK)
    assert(await counters(page) === '0/2', `counters ${await counters(page)}`)
    const leoRow = await page.evaluate(() => [...document.querySelectorAll('tbody tr')].find(r => r.innerText.includes('Leo STALETEST'))?.innerText.replace(/\s+/g, ' '))
    assert(leoRow.includes('No show') && leoRow.includes('Showed up'), `Leo's row: ${leoRow}`)
  })
} finally {
  await browser.close()
}
process.exit(summary() ? 1 : 0)
