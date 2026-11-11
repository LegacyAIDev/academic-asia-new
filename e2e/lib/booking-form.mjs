/** Helpers for the Scheduler's booking drawer, shared by the exam suites. */
import { click, clickElement, hkDay, open, seeText } from './harness.mjs'

export const DIALOG = '[role="dialog"]'
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))

/** Opens the Select whose label reads `label` inside the dialog and picks an option, checking it took. */
export async function chooseByLabel(page, label, option) {
  const findTrigger = () => page.waitForFunction((l) => {
    const labels = [...document.querySelectorAll('[role="dialog"] label')].filter(el => el.innerText.trim() === l)
    return labels.map(el => el.parentElement.querySelector('button[role="combobox"]')).find(Boolean) ?? null
  }, { polling: 100 }, label)
  for (let attempt = 1; attempt <= 2; attempt++) {
    await clickElement((await findTrigger()).asElement())
    await click(page, option, '[data-slot="select-content"]')
    await page.waitForFunction(() => !document.querySelector('[data-slot="select-content"]'), { polling: 100 })
    await pause(300)
    const shown = await (await findTrigger()).asElement().evaluate(el => el.innerText.trim())
    if (shown === option) return
    if (attempt === 2) throw new Error(`${label}: picked "${option}" but the field shows "${shown}"`)
    console.log(`  (retrying ${label}: the field showed "${shown}" instead of "${option}")`)
  }
}

/** Fills a new Examination for Lucas Ng today; online with a link, or in the Exam Room. */
export async function newExam(page, title, { online = true, student = true, application = false, start = '11:00', end = '11:45' } = {}) {
  await open(page, '/scheduler')
  await click(page, 'New booking')
  await page.waitForSelector(DIALOG)
  await new Promise(resolve => setTimeout(resolve, 500)) // the form slides in from the side
  await chooseByLabel(page, 'Type', 'Examination')
  await page.$eval(`${DIALOG} input[name="title"]`, el => { el.value = '' })
  await page.type(`${DIALOG} input[name="title"]`, title)
  await chooseByLabel(page, 'Start (HKT)', start)
  await chooseByLabel(page, 'End (HKT)', end)
  if (online) {
    await page.click('#location-online')
    await page.waitForSelector('#online-link')
    await page.type('#online-link', 'https://meet.example.com/uat-exam')
  } else {
    const room = await page.waitForFunction(() => [...document.querySelectorAll('[aria-label="Available rooms"] [role="option"]')].find(o => o.innerText.includes('Exam Room')) ?? null, { polling: 100 })
    await room.asElement().click()
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

export async function saveBooking(page) {
  await click(page, 'Save', DIALOG)
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { polling: 100, timeout: 30000 })
}

/**
 * The day New booking proposes: today in Hong Kong, or tomorrow once the next
 * 15-minute slot is past the 21:00 close (the app's own rule, slotForDay).
 */
export function bookingDay() {
  const hk = new Date(Date.now() + 8 * 3600000)
  const minutes = hk.getUTCHours() * 60 + hk.getUTCMinutes() + (hk.getUTCSeconds() > 0 ? 1 : 0)
  const nextSlot = Math.ceil(minutes / 15) * 15
  return nextSlot > 21 * 60 ? hkDay(1) : hkDay()
}

/** Opens a booking's side panel from the week calendar by its title; `day` picks the week to show. */
export async function openBookingFromCalendar(page, title, day = hkDay()) {
  await open(page, `/scheduler?date=${day}`)
  const event = await page.waitForFunction(t => [...document.querySelectorAll('[role=button]')].find(e => e.innerText?.includes(t)) ?? null, { polling: 100 }, title)
  await event.asElement().click()
  await seeText(page, title, '[role="dialog"]')
}
