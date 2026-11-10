/**
 * End-to-end check of the Events module for every event type: create, view,
 * edit, open its scheduler, then delete. Runs in Hong Kong time.
 * Needs psql on PATH and E2E_DB_URL for the local test database.
 */
import { execFileSync } from 'node:child_process'
import { assert, BASE, click, hkDay, launch, open, seeText, setValue, signIn, step, summary } from './lib/harness.mjs'

const DB = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = query => execFileSync('psql', [DB, '-X', '-A', '-t', '-q', '-c', query], { encoding: 'utf8' }).trim()
// URL slug, category and type as the form lists them.
const TYPES = [
  ['expo-fair', 'Engagement & Guidance', 'Expo / Fair'], ['seminar-webinar', 'Engagement & Guidance', 'Seminar / Webinar'],
  ['briefing-meeting', 'Engagement & Guidance', 'Briefing / Meeting'], ['reception-social', 'Engagement & Guidance', 'Reception / Social'],
  ['interview', 'Admission & Assessment', 'Interview Day'], ['audition-day', 'Admission & Assessment', 'Audition Day'],
  ['group-entrance-exam', 'Admission & Assessment', 'Group Entrance Exam'], ['school-assessment-scholarship', 'Admission & Assessment', 'School Assessment / Scholarship'],
]

/** Picks an option in the Select that follows a label in the form. */
async function chooseAfterLabel(page, labelText, option) {
  const trigger = await page.waitForFunction(l => {
    const label = [...document.querySelectorAll('main label')].find(el => el.innerText.replace('*', '').trim() === l)
    return label?.parentElement.querySelector('button[role="combobox"]') ?? null
  }, { polling: 100 }, labelText)
  await trigger.asElement().click()
  await click(page, option, '[data-slot="select-content"]')
  await page.waitForFunction(() => !document.querySelector('[data-slot="select-content"]'), { polling: 100 })
  await new Promise(r => setTimeout(r, 300))
}
const DAY = hkDay(5)
const ERROR_SCREEN = /This page couldn.t load|Application error/

sql(`delete from public.events where name like 'UAT Event%'`)

const browser = await launch()
try {
  const { page } = await signIn(browser, 'manager@aa.test')
  await page.emulateTimezone('Asia/Hong_Kong')
  const errors = []
  page.on('pageerror', e => errors.push(e.message))

  await step(page, 'a new event from a type page starts with that type chosen, and a missing type is explained', async () => {
    await open(page, '/events/interview/new')
    const chosen = await page.evaluate(() => [...document.querySelectorAll('main label')]
      .filter(l => ['Category', 'Event Type'].includes(l.innerText.replace('*', '').trim()))
      .map(l => l.parentElement.querySelector('button[role="combobox"]')?.innerText.trim()).join(' / '))
    assert(chosen === 'Admission & Assessment / Interview Day', `preselected: ${chosen}`)
    // Switching the category clears the preselected type.
    await open(page, '/events/expo-fair/new')
    await chooseAfterLabel(page, 'Category', 'Admission & Assessment')
    await page.type('#name', 'UAT Event no type')
    await page.click('main button[type="submit"]')
    await seeText(page, 'Choose the event type')
    assert(sql(`select count(*) from public.events where name = 'UAT Event no type'`) === '0', 'saved without a type')
  })

  for (const [type, category, label] of TYPES) {
    const name = `UAT Event ${type}`
    let id = null

    await step(page, `${type}: create, view and find it in the list`, async () => {
      await open(page, `/events/${type}/new`)
      await chooseAfterLabel(page, 'Category', category)
      await chooseAfterLabel(page, 'Event Type', label)
      await page.type('#name', name)
      await setValue(page, '#start_date', DAY)
      if (await page.$('#start_time')) await setValue(page, '#start_time', '10:00')
      await Promise.all([
        page.waitForFunction(t => new RegExp(`^/events/${t}/[0-9a-f-]{36}$`).test(location.pathname), { polling: 100, timeout: 60000 }, type),
        click(page, 'Create Event', 'main', { prefix: true }).catch(() => page.click('main button[type="submit"]')),
      ])
      id = page.url().split('/').pop()
      await seeText(page, name)
      assert(!ERROR_SCREEN.test(await page.evaluate(() => document.body.innerText)), 'error screen on the event page')
      assert(sql(`select start_date from public.events where id = '${id}'`) === DAY, `saved date ${sql(`select start_date from public.events where id = '${id}'`)}, picked ${DAY}`)
      await open(page, `/events/${type}`)
      await seeText(page, name)
    })

    await step(page, `${type}: edit the name`, async () => {
      assert(id, 'no event created')
      await open(page, `/events/${type}/${id}/edit`)
      await page.$eval('#name', el => el.select())
      await page.keyboard.press('Backspace')
      await page.type('#name', `${name} edited`)
      await Promise.all([
        page.waitForFunction(i => location.pathname.endsWith(`/${i}`), { polling: 100, timeout: 60000 }, id),
        page.click('main button[type="submit"]'),
      ])
      await seeText(page, `${name} edited`)
      assert(sql(`select start_date from public.events where id = '${id}'`) === DAY, 'the edit changed the date')
    })

    await step(page, `${type}: its scheduler page opens when the event offers one`, async () => {
      await open(page, `/events/${type}/${id}`)
      const href = await page.evaluate(() => [...document.querySelectorAll('a[href$="/scheduler"]')].find(a => a.closest('main'))?.getAttribute('href') ?? null)
      if (!href) return
      const res = await page.goto(`${BASE}${href}`, { waitUntil: 'networkidle2', timeout: 120000 })
      assert(res.status() < 400, `status ${res.status()}`)
      assert(!ERROR_SCREEN.test(await page.evaluate(() => document.body.innerText)), 'error screen on the scheduler page')
    })

    await step(page, `${type}: delete it`, async () => {
      await open(page, `/events/${type}/${id}`)
      await click(page, 'Delete', 'main', { prefix: true })
      await page.waitForSelector('[role="alertdialog"]')
      await new Promise(r => setTimeout(r, 400))
      await click(page, 'Delete Event', '[role="alertdialog"]')
      await page.waitForFunction(t => location.pathname === `/events/${t}` || location.pathname === '/events', { polling: 100, timeout: 60000 }, type)
      assert(sql(`select count(*) from public.events where id = '${id}'`) === '0', 'event still in the database')
    })
  }

  await step(page, 'no uncaught errors on any events page', async () => {
    assert(errors.length === 0, errors.slice(0, 3).join(' | '))
  })
} finally {
  await browser.close()
}
process.exit(summary() ? 1 : 0)
