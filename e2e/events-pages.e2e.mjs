/**
 * Events pages: Add event by category, category chips on All events, labelled
 * From/To dates on a category list, a next-step prompt and Delete under More on
 * an event, and the form working out the duration from the times.
 */
import { execFileSync } from 'node:child_process'
import { launch, signIn, open, step, click, seeText, notSeeText, assert, summary, shot, setValue } from './lib/harness.mjs'

const DB = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = q => execFileSync('psql', [DB, '-At', '-c', q], { encoding: 'utf8' }).trim()

const browser = await launch()
try {
  const { page } = await signIn(browser, 'manager@aa.test')
  await page.setViewport({ width: 1512, height: 982 })

  await step(page, 'all events: no zero stat cards, chips filter, Add event lists categories', async () => {
    await open(page, '/events')
    await notSeeText(page, 'Total Schedules')
    await shot(page, 'events-all')
    await page.$$eval('nav[aria-label="Category"] a', as => as.find(a => a.innerText.startsWith('Expo')).click())
    await page.waitForFunction(() => location.search.includes('type=expo-fair'))
    const kinds = await page.$$eval('main ul li a span.block.truncate.text-sm', s => s.map(x => x.innerText))
    assert(kinds.every(k => k.startsWith('Expo')), `other kinds shown: ${kinds.join(' | ')}`)
    await click(page, 'Add event', 'main header')
    await seeText(page, 'Group entrance exam', '[role="menu"]')
    await page.keyboard.press('Escape')
  })

  await step(page, 'category list: dates labelled From and To', async () => {
    await open(page, '/events/briefing-meeting')
    await seeText(page, 'From')
    await seeText(page, 'To')
    assert(!(await page.$('main input[type="date"]')), 'still a browser date box')
  })

  await step(page, 'event: next step for an event with no schools, Delete under More', async () => {
    const id = sql(`insert into public.events (name, event_type_id, category_id, start_date) select 'UAT Next step', id, category_id, (now() + interval '9 days')::date from public.event_types where code = 'expo_fair' returning id`).split('\n')[0]
    await open(page, `/events/expo-fair/${id}`)
    await seeText(page, 'Next step:')
    await seeText(page, 'Add the schools taking part')
    await notSeeText(page, 'Delete', 'main header')
    await page.click('main button[aria-label="More actions"]')
    await seeText(page, 'Delete event', '[role="menu"]')
    await page.keyboard.press('Escape')
    // The prompt opens the edit drawer at the schools part of the form.
    await click(page, 'Add schools', 'main')
    await page.waitForFunction(() => location.search.includes('edit=schools'))
    await page.waitForSelector('[role="dialog"] #schools', { timeout: 60000 })
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !location.search.includes('edit='), { timeout: 20000 })
    sql(`delete from public.events where id = '${id}'`)
  })

  await step(page, 'form: duration worked out from the times', async () => {
    await open(page, '/events/seminar-webinar/new')
    await page.waitForSelector('[role="dialog"] #start_time', { timeout: 60000 })
    await setValue(page, '#start_time', '10:00')
    await setValue(page, '#end_time', '11:30')
    await seeText(page, 'Lasts 1 h 30 min')
    assert(!(await page.$('#duration_minutes')), 'duration box still shown with times set')
  })
} finally {
  await browser.close()
}
process.exitCode = summary()
