/**
 * End-to-end check of the Scheduler pages in the new style: the week reads as
 * a date range, Rooms opens on one day, the Team empty state has its own
 * people picker, the booking page offers Confirm, Edit and Cancel, New booking
 * opens as a drawer, the rooms list says why a room cannot be deleted, and a
 * phone starts on the day.
 * Needs psql on PATH and E2E_DB_URL for the local test database.
 */
import { execFileSync } from 'node:child_process'
import { assert, click, hkDay, launch, open, seeText, signIn, step, summary } from './lib/harness.mjs'

const DB = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = query => execFileSync('psql', [DB, '-X', '-A', '-t', '-q', '-c', query], { encoding: 'utf8' }).trim()
const DIALOG = '[role="dialog"]'
const MENU = '[role="menu"]'
const DAY = hkDay(4)

sql(`delete from public.scheduler_bookings where title like 'UAT pages%'`)
sql(`delete from public.scheduler_locations where name like 'UAT pages%'`)
const manager = sql(`select id from auth.users where email = 'manager@aa.test'`)
const bookingId = sql(`select set_config('request.jwt.claims', '{"sub":"${manager}","role":"authenticated"}', false);
  select public.scheduler_save_booking(jsonb_build_object(
    'title', 'UAT pages meeting', 'booking_type', 'internal_meeting', 'start_at', '${DAY}T02:00:00Z', 'end_at', '${DAY}T03:00:00Z',
    'location_type', 'online', 'online_link', 'https://meet.example.com/uat-pages'), '[]'::jsonb)`).split('\n').pop()

const browser = await launch()
try {
  const { page } = await signIn(browser, 'manager@aa.test')
  await page.emulateTimezone('Asia/Hong_Kong')

  await step(page, 'the week is shown as a date range', async () => {
    await open(page, '/scheduler?date=2026-11-11')
    await seeText(page, '9–15 Nov 2026')
  })

  await step(page, 'Rooms opens on one day', async () => {
    await click(page, 'Rooms', '[role="tablist"]')
    await page.waitForFunction(() => location.search.includes('view=rooms'), { polling: 100 })
    await seeText(page, 'Wednesday 11 Nov 2026')
  })

  await step(page, 'the Team empty state has its own people picker', async () => {
    await open(page, '/scheduler?view=team')
    await seeText(page, 'Choose colleagues or students to compare their calendars')
    const pickers = await page.$$eval('button', bs => bs.filter(b => b.innerText.trim() === 'People').length)
    assert(pickers === 1, `People buttons: ${pickers}`)
  })

  await step(page, 'New booking opens as a drawer with What first and Save in view', async () => {
    await open(page, '/scheduler')
    await click(page, 'New booking')
    await seeText(page, 'What', DIALOG)
    const saveVisible = await page.$eval(DIALOG, d => {
      const save = [...d.querySelectorAll('button[type="submit"]')].pop()
      const r = save.getBoundingClientRect()
      return r.bottom <= innerHeight && r.top >= 0
    })
    assert(saveVisible, 'Save is below the fold')
    await page.keyboard.press('Escape')
  })

  await step(page, 'the booking page offers Confirm, Edit and Cancel, and names the location', async () => {
    await open(page, `/scheduler/bookings/${bookingId}`)
    await seeText(page, 'Confirm')
    await seeText(page, 'Location')
    await page.click('button[aria-label="More actions"]')
    await seeText(page, 'Cancel booking', MENU)
    await page.keyboard.press('Escape')
    await click(page, 'Edit')
    await seeText(page, 'Edit booking', DIALOG)
    await page.waitForFunction(() => !location.search.includes('edit='), { polling: 100 })
    const title = await page.$eval(`${DIALOG} input[name="title"]`, el => el.value)
    assert(title === 'UAT pages meeting', `form title: ${title}`)
  })

  await step(page, 'a room with bookings says why it cannot be deleted', async () => {
    await open(page, '/scheduler/rooms')
    await page.click('button[aria-label="More actions for Exam Room"]')
    await seeText(page, 'so deactivate it instead', MENU)
    await page.keyboard.press('Escape')
  })

  await step(page, 'New room opens as a drawer', async () => {
    await open(page, '/scheduler/rooms')
    await click(page, 'New room')
    await seeText(page, 'A name, a location and the number of seats are enough to start.', DIALOG)
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { polling: 100 })
  })

  await step(page, 'a location is added inside the Locations drawer, with no second pop-up', async () => {
    await click(page, 'Manage locations')
    await seeText(page, 'Locations', DIALOG)
    await click(page, 'Add location', DIALOG)
    await page.waitForSelector('#location-name')
    await page.type('#location-name', 'UAT pages office')
    await click(page, 'Add location', `${DIALOG} form`)
    await seeText(page, 'Location created')
    const dialogs = await page.$$eval('[role="dialog"]', ds => ds.length)
    assert(dialogs === 1, `${dialogs} dialogs open`)
    await seeText(page, 'UAT pages office', DIALOG)
    assert(sql(`select count(*) from public.scheduler_locations where name = 'UAT pages office'`) === '1', 'location not saved')
    await page.keyboard.press('Escape')
  })

  await step(page, 'a phone starts the calendar on the day', async () => {
    await page.setViewport({ width: 390, height: 844 })
    await open(page, '/scheduler')
    await page.waitForFunction(() => location.search.includes('mode=day'), { polling: 100, timeout: 10000 })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    assert(overflow === 0, `page scrolls sideways by ${overflow}px`)
    await page.setViewport({ width: 1440, height: 900 })
  })
} finally {
  sql(`delete from public.scheduler_bookings where title like 'UAT pages%'`)
  sql(`delete from public.scheduler_locations where name like 'UAT pages%'`)
  await browser.close()
}
summary()
