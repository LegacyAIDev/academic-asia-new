/**
 * End-to-end checks of UAT DEV24-006, 007, 008, 009, 011 and 012:
 *   006 New booking starts on the day the calendar shows
 *   007 Book consultation from a student keeps that student
 *   008 a seat beyond the room's seats is named, and can be corrected
 *   009 an exam result's school is chosen by name
 *   011 Add > Note starts a note
 *   012 an unsupported upload is refused with the reason
 * Runs in Hong Kong time. Needs psql on PATH and E2E_DB_URL for the local test database.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { assert, click, hkDay, launch, open, SEED, seeText, signIn, step, summary } from './lib/harness.mjs'
import { chooseByLabel, DIALOG } from './lib/booking-form.mjs'

const DB = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const FIX = process.env.E2E_FIXTURES ?? '/tmp/aa-localdb/fixtures'
const sql = query => execFileSync('psql', [DB, '-X', '-A', '-t', '-q', '-c', query], { encoding: 'utf8' }).trim()
const pause = ms => new Promise(r => setTimeout(r, ms))
const S = SEED.student

sql(`delete from public.scheduler_bookings where title like 'UAT rem%'`)
sql(`delete from public.scheduler_rooms where display_name = 'UAT Two Seat'`)
sql(`insert into public.scheduler_rooms (display_name, location_id, capacity, is_active, is_exam_suitable)
     values ('UAT Two Seat', (select id from public.scheduler_locations limit 1), 2, true, true)`)
sql(`delete from public.student_exam_results where remarks = 'UAT rem result'`)
sql(`delete from public.record_notes where body like '%UAT rem note%'`)
sql(`delete from public.students where surname = 'REMTEST'`)
sql(`insert into public.students (surname, first_name, student_code) values ('REMTEST', 'Leo', 'S0REM')`)
const textFile = path.join(FIX, 'notes.txt')
fs.writeFileSync(textFile, 'This is a plain text file, not a PDF.\n')

const dialogCombos = page => page.evaluate(() => [...document.querySelector('[role="dialog"]').querySelectorAll('button[role="combobox"]')].map(b => b.innerText.trim()))
const dialogDate = page => page.evaluate(() => [...document.querySelector('[role="dialog"]').querySelectorAll('button')].find(b => /\d{2} \w{3} \d{4}/.test(b.innerText))?.innerText.trim())

const browser = await launch()
try {
  const { page } = await signIn(browser, 'manager@aa.test')
  await page.emulateTimezone('Asia/Hong_Kong')

  await step(page, '006: New booking starts at 09:00 on the day the calendar shows, not today', async () => {
    const day = hkDay(3)
    await open(page, `/scheduler?date=${day}`)
    await click(page, 'New booking')
    await page.waitForSelector(DIALOG)
    const expected = new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Hong_Kong' })
    assert(await dialogDate(page) === expected, `date ${await dialogDate(page)}, expected ${expected}`)
    const combos = await dialogCombos(page)
    assert(combos.includes('09:00') && combos.includes('10:00'), `times ${combos.join(', ')}`)
    await page.keyboard.press('Escape')
  })

  await step(page, '007: Book consultation from the student keeps the student and offers their applications', async () => {
    await open(page, `/students/${S}?tab=calendar`)
    await click(page, 'Book consultation')
    await page.waitForSelector(DIALOG)
    await seeText(page, 'Lucas Ng', DIALOG)
    assert(!(await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] button')].some(b => b.innerText.trim() === 'Search students...'))), 'the student search is still showing')
    await chooseByLabel(page, 'Application', 'Headington School (2027)')
    await page.type(`${DIALOG} input[name="title"]`, 'UAT rem consultation')
    await chooseByLabel(page, 'Start (HKT)', '15:00')
    await chooseByLabel(page, 'End (HKT)', '15:30')
    await page.click('#location-online')
    await page.type('#online-link', 'https://meet.example.com/uat')
    await click(page, 'Save', DIALOG)
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { polling: 100, timeout: 30000 })
    const saved = sql(`select booking_type || '|' || (student_id = '${S}') || '|' || (application_id is not null) from public.scheduler_bookings where title = 'UAT rem consultation'`)
    assert(saved === 'consultation|true|true', `saved ${saved}`)
  })

  await step(page, '008: a seat beyond the room is named before saving, and the corrected seat saves', async () => {
    await open(page, `/scheduler?date=${hkDay(4)}`)
    await click(page, 'New booking')
    await page.waitForSelector(DIALOG)
    await chooseByLabel(page, 'Type', 'Group examination')
    await page.type(`${DIALOG} input[name="title"]`, 'UAT rem group')
    const room = await page.waitForFunction(() => [...document.querySelectorAll('[aria-label="Available rooms"] [role="option"]')].find(o => o.innerText.includes('UAT Two Seat')) ?? null, { polling: 100 })
    await room.asElement().click()
    for (const name of ['Lucas', 'REMTEST']) {
      await click(page, 'Add candidate...', DIALOG)
      await page.waitForSelector('[cmdk-input]')
      await page.type('[cmdk-input]', name)
      const option = await page.waitForFunction(n => [...document.querySelectorAll('[cmdk-list] [cmdk-item]')].find(o => o.innerText.includes(n)) ?? null, { polling: 100 }, name === 'Lucas' ? 'Lucas Ng' : 'Leo REMTEST')
      await option.asElement().click()
      await pause(400)
    }
    const seats = () => page.$$(`${DIALOG} table input[type="number"]`)
    const setSeat = async (index, value) => {
      const input = (await seats())[index]
      await input.focus()
      for (let i = 0; i < 4; i++) await page.keyboard.press('Backspace')
      await input.type(String(value))
    }
    await setSeat(0, 1)
    await setSeat(1, 3)
    await click(page, 'Save', DIALOG)
    await seeText(page, "Seat 3 is outside this room's seats (1–2)", `${DIALOG} [role="alert"]`)
    assert(sql(`select count(*) from public.scheduler_bookings where title = 'UAT rem group'`) === '0', 'saved with seat 3')
    await setSeat(1, 0)
    assert(!(await page.$(`${DIALOG} [role="alert"]`)), 'the old seat message is still showing after the change')
    await click(page, 'Save', DIALOG)
    assert(await page.$$eval(`${DIALOG} table input[type="number"]`, els => els[1].validity.rangeUnderflow), 'seat 0 not flagged by the browser')
    assert(sql(`select count(*) from public.scheduler_bookings where title = 'UAT rem group'`) === '0', 'saved with seat 0')
    await setSeat(1, 2)
    await click(page, 'Save', DIALOG)
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { polling: 100, timeout: 30000 })
    assert(sql(`select string_agg(seat_no::text, ',' order by seat_no) from public.scheduler_booking_attendees a join public.scheduler_bookings b on b.id = a.booking_id where b.title = 'UAT rem group'`) === '1,2', 'seats not saved')
  })

  await step(page, '009: an exam result school is searched and chosen by name, and shown again when editing', async () => {
    await open(page, `/students/${S}?tab=education`)
    await click(page, 'Add exam result', 'main')
    await page.waitForSelector(DIALOG)
    assert(!(await page.evaluate(() => document.querySelector('[role="dialog"]').innerText.includes('UUID'))), 'still asks for a UUID')
    await click(page, 'Search schools (optional)', DIALOG, { prefix: true }).catch(() => page.click(`${DIALOG} button[aria-label="School"]`))
    await page.waitForSelector('[cmdk-input]')
    await page.type('[cmdk-input]', 'Head')
    const option = await page.waitForFunction(() => [...document.querySelectorAll('[cmdk-list] [cmdk-item]')].find(o => o.innerText.includes('Headington School')) ?? null, { polling: 100 })
    await option.asElement().click()
    await chooseByLabel(page, 'Test / Exam', 'AA Test')
    await page.type(`${DIALOG} textarea[name="remarks"], ${DIALOG} input[name="remarks"]`, 'UAT rem result')
    await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] button[type="submit"]')].pop().click())
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { polling: 100, timeout: 30000 })
    assert(sql(`select s.name from public.student_exam_results r join public.schools s on s.id = r.school_id where r.remarks = 'UAT rem result'`) === 'Headington School', 'school not saved')
  })

  const addNote = async () => {
    await click(page, 'Add', 'main header')
    await click(page, 'Note', '[role="menu"]')
  }
  await step(page, '011: Add > Note starts a note, from Overview and from another tab', async () => {
    await open(page, `/students/${S}?tab=overview`)
    await addNote()
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'New note', { polling: 100, timeout: 5000 })
    await page.keyboard.type('UAT rem note from quick actions')
    await page.keyboard.down('Control'); await page.keyboard.press('Enter'); await page.keyboard.up('Control')
    await seeText(page, 'UAT rem note from quick actions', '#student-notes')
    await open(page, `/students/${S}?tab=family`)
    await addNote()
    await page.waitForFunction(() => location.search.includes('tab=overview') && document.activeElement?.getAttribute('aria-label') === 'New note', { polling: 100, timeout: 30000 })
    assert(!(await page.evaluate(() => [...document.querySelectorAll('button')].some(b => b.innerText.trim() === 'Log Call'))), 'Log Call still shown')
  })

  await step(page, '012: an unsupported file is refused when chosen, with the reason; a PDF still uploads', async () => {
    await open(page, `/students/${S}?tab=documents`)
    const input = await page.waitForSelector('main input[type="file"][multiple]')
    await input.uploadFile(textFile)
    await seeText(page, "notes.txt can't be uploaded: only PDF, JPG, PNG and WebP files are accepted.", '[data-sonner-toaster]')
    assert(!(await page.evaluate(() => [...document.querySelectorAll('main input')].some(i => i.value === 'notes'))), 'the text file was staged')
    const before = Number(sql(`select count(*) from public.student_documents where student_id = '${S}'`))
    await input.uploadFile(path.join(FIX, 'english-v1.pdf'))
    await click(page, 'Upload', 'main', { prefix: true })
    for (let i = 0; i < 80 && Number(sql(`select count(*) from public.student_documents where student_id = '${S}'`)) === before; i++) await pause(250)
    assert(Number(sql(`select count(*) from public.student_documents where student_id = '${S}'`)) === before + 1, 'the PDF was not uploaded')
  })
} finally {
  await browser.close()
}
process.exit(summary() ? 1 : 0)
