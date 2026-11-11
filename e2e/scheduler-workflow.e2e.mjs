/**
 * End-to-end check of the Scheduler beyond exams: each other booking type
 * saves, a room reservation asks for its purpose, a booking can be cancelled
 * with a reason, a blocked time asks for a name and then saves, and a new room
 * can be added. Runs in Hong Kong time.
 * Needs psql on PATH and E2E_DB_URL for the local test database.
 */
import { execFileSync } from 'node:child_process'
import { assert, click, launch, open, seeText, signIn, step, summary } from './lib/harness.mjs'
import { chooseByLabel, DIALOG, openBookingFromCalendar } from './lib/booking-form.mjs'

const DB = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = query => execFileSync('psql', [DB, '-X', '-A', '-t', '-q', '-c', query], { encoding: 'utf8' }).trim()
const pause = ms => new Promise(r => setTimeout(r, ms))

sql(`delete from public.scheduler_bookings where title like 'UAT sched%'`)
sql(`delete from public.scheduler_blocked_times where label like 'UAT%'`)
sql(`delete from public.scheduler_rooms where display_name like 'UAT Room%'`)

const statusOf = title => sql(`select booking_type || '|' || status || '|' || location_type from public.scheduler_bookings where title = '${title}'`)

async function newBooking(page, type, title, { start, end, room, online, student, notes }) {
  await open(page, '/scheduler')
  await click(page, 'New booking')
  await page.waitForSelector(DIALOG)
  await pause(500) // the form slides in from the side
  await chooseByLabel(page, 'Type', type)
  await page.$eval(`${DIALOG} input[name="title"]`, el => { el.value = '' })
  await page.type(`${DIALOG} input[name="title"]`, title)
  await chooseByLabel(page, 'Start (HKT)', start)
  await chooseByLabel(page, 'End (HKT)', end)
  if (online) {
    await page.click('#location-online')
    await page.waitForSelector('#online-link')
    await page.type('#online-link', 'https://meet.example.com/uat')
  }
  if (room) {
    const option = await page.waitForFunction(r => [...document.querySelectorAll('[aria-label="Available rooms"] [role="option"]')].find(o => o.innerText.includes(r)) ?? null, { polling: 100 }, room)
    await option.asElement().click()
  }
  if (student) {
    await click(page, 'Search students...', DIALOG)
    await page.waitForSelector('[cmdk-input]')
    await page.type('[cmdk-input]', 'Lucas')
    await click(page, 'Lucas Ng · S000123', '[cmdk-list]')
  }
  if (notes) await page.type(`${DIALOG} textarea[name="notes"]`, notes)
}

async function save(page) {
  await click(page, 'Save', DIALOG)
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { polling: 100, timeout: 30000 })
}

const browser = await launch()
try {
  const { page } = await signIn(browser, 'manager@aa.test')
  await page.emulateTimezone('Asia/Hong_Kong')

  await step(page, 'a consultation in a room saves, confirmed', async () => {
    await newBooking(page, 'Consultation', 'UAT sched consultation', { start: '18:00', end: '18:30', room: 'Consultation', student: true })
    await save(page)
    assert(statusOf('UAT sched consultation') === 'consultation|confirmed|room', statusOf('UAT sched consultation'))
  })

  await step(page, 'an online school interview saves', async () => {
    await newBooking(page, 'School interview', 'UAT sched interview', { start: '19:00', end: '19:30', online: true, student: true })
    await save(page)
    assert(statusOf('UAT sched interview') === 'school_interview|confirmed|online', statusOf('UAT sched interview'))
  })

  await step(page, 'an online internal meeting saves', async () => {
    await newBooking(page, 'Internal meeting', 'UAT sched meeting', { start: '20:00', end: '20:30', online: true })
    await save(page)
    assert(statusOf('UAT sched meeting') === 'internal_meeting|confirmed|online', statusOf('UAT sched meeting'))
  })

  await step(page, 'a room reservation asks for its purpose, then saves', async () => {
    await newBooking(page, 'Room reservation', 'UAT sched reservation', { start: '21:00', end: '21:45', room: 'Churchill' })
    await click(page, 'Save', DIALOG)
    await seeText(page, 'Describe the purpose of the reservation', `${DIALOG} [role="alert"]`)
    await page.type(`${DIALOG} textarea[name="notes"]`, 'Parent workshop set-up')
    await save(page)
    assert(statusOf('UAT sched reservation') === 'room_reservation|confirmed|room', statusOf('UAT sched reservation'))
  })

  await step(page, 'a booking is cancelled with a reason', async () => {
    await openBookingFromCalendar(page, 'UAT sched consultation')
    await seeText(page, 'Created', '[role="dialog"]')
    await pause(600)
    await click(page, 'Edit', '[role="dialog"]')
    await page.waitForFunction(() => [...document.querySelectorAll('[role="dialog"]')].some(d => d.innerText.includes('Edit booking')), { polling: 100 })
    await pause(400)
    await click(page, 'Cancel booking', '[role="dialog"]')
    const reason = await page.waitForSelector('[role="dialog"] textarea[placeholder^="Why is this booking"]')
    await reason.type('Family asked to move it')
    await pause(300)
    await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] button')].reverse().find(b => b.innerText.trim() === 'Cancel booking' && !b.disabled)?.click())
    for (let i = 0; i < 80 && !statusOf('UAT sched consultation').includes('cancelled'); i++) await pause(250)
    assert(statusOf('UAT sched consultation') === 'consultation|cancelled|room', statusOf('UAT sched consultation'))
  })

  await step(page, 'a blocked time asks for a name, then saves', async () => {
    await open(page, '/scheduler')
    await click(page, 'Blocked times')
    await page.waitForSelector(DIALOG)
    await pause(500)
    await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] button')].find(b => b.innerText.trim() === 'Add blocked time')?.click())
    await page.waitForSelector('#block-label')
    await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] button[type="submit"]')].pop()?.click())
    await seeText(page, 'Give the block a name', DIALOG)
    await page.type('#block-label', 'UAT lunch')
    await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] button[type="submit"]')].pop()?.click())
    for (let i = 0; i < 80 && sql(`select count(*) from public.scheduler_blocked_times where label = 'UAT lunch'`) === '0'; i++) await pause(250)
    assert(sql(`select count(*) from public.scheduler_blocked_times where label = 'UAT lunch'`) === '1', 'blocked time not saved')
    await page.keyboard.press('Escape')
  })

  await step(page, 'a new room is added to the rooms list', async () => {
    await open(page, '/scheduler/rooms')
    await click(page, 'New room')
    await page.waitForSelector(`${DIALOG} input[name="display_name"]`)
    await pause(500) // the form slides in from the side
    await page.type(`${DIALOG} input[name="display_name"]`, 'UAT Room 501')
    const capacity = await page.$(`${DIALOG} input[name="capacity"]`)
    if (capacity) { await capacity.click({ clickCount: 3 }); await capacity.type('4') }
    await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] button[type="submit"]')].pop()?.click())
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { polling: 100, timeout: 30000 })
    await seeText(page, 'UAT Room 501')
    assert(sql(`select count(*) from public.scheduler_rooms where display_name = 'UAT Room 501'`) === '1', 'room not saved')
  })
} finally {
  await browser.close()
}
process.exit(summary() ? 1 : 0)
