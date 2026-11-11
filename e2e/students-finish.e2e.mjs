/**
 * The rest of the Students review: add-student defaults, the short application
 * form, next step and one history on an application, calendar paging, document
 * type filters and read-only staff, the brief introduction filter, and the
 * current schools page.
 */
import { execFileSync } from 'node:child_process'
import { launch, signIn, open, step, click, seeText, notSeeText, assert, summary, SEED } from './lib/harness.mjs'

const DB = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = q => execFileSync('psql', [DB, '-At', '-c', q], { encoding: 'utf8' }).trim()
const S = SEED.student
const DIALOG = '[role="dialog"]'

const browser = await launch()
try {
  const { page } = await signIn(browser, 'manager@aa.test')
  await page.setViewport({ width: 1512, height: 982 })

  await step(page, 'add student opens as a drawer from the dashboard and lands on the new student', async () => {
    await open(page, '/')
    await click(page, 'Add student', 'main header')
    await page.waitForSelector('[role="dialog"] #surname', { timeout: 60000 })
    const surname = `DRAWER${Date.now() % 100000}`
    await page.type('[role="dialog"] #surname', surname)
    await page.type('[role="dialog"] #first_name', 'Ada')
    await Promise.all([
      page.waitForFunction(() => /^\/students\/[0-9a-f-]{36}$/.test(location.pathname), { polling: 100, timeout: 60000 }),
      click(page, 'Create Student', '[role="dialog"]'),
    ])
    await seeText(page, surname, 'main header')
    sql(`delete from public.students where surname = '${surname}'`)
  })

  await step(page, 'add student: newsletter unticked, no enrolment date, plain help', async () => {
    await open(page, '/students/new')
    await page.waitForFunction(() => location.search.includes('add=student'))
    await page.waitForSelector('[role="dialog"] #aa_news', { timeout: 60000 })
    assert(await page.$eval('#aa_news', el => el.getAttribute('aria-checked') ?? el.getAttribute('data-state')) !== 'true', 'newsletter ticked')
    await seeText(page, 'Not enrolled yet')
    await seeText(page, 'With Academic Asia')
    await seeText(page, 'How likely the family is to go ahead')
  })

  await step(page, 'new application: essentials first, optional groups folded, first step preselected', async () => {
    await open(page, `/students/${S}?tab=applications&add=application`)
    await page.waitForSelector(DIALOG)
    const open_ = await page.$$eval(`${DIALOG} details`, ds => ds.filter(d => d.open).length)
    assert(open_ === 0, `${open_} optional groups open on a new application`)
    const status = await page.$eval(`${DIALOG} button[aria-label="Status"]`, b => b.innerText.trim())
    assert(status && status !== 'Select', `status preselected: ${status}`)
    await notSeeText(page, 'C.S.D.', DIALOG)
    await page.keyboard.press('Escape')
  })

  await step(page, 'application page: step and school status together, next step, one history', async () => {
    const app = sql(`select id from public.student_applications where student_id = '${S}' limit 1`)
    await open(page, `/students/${S}/applications/${app}`)
    await seeText(page, 'Next step:')
    await seeText(page, 'History')
    await notSeeText(page, 'Timeline')
    await page.evaluate(() => [...document.querySelectorAll('summary')].find(s => s.innerText.includes('Show every change')).click())
    await seeText(page, 'Hide every change')
  })

  await step(page, 'calendar: Later moves the dates on, Today comes back', async () => {
    await open(page, `/students/${S}?tab=calendar`)
    const before = await page.$eval('nav[aria-label="Dates shown"]', n => n.parentElement.innerText.split('\n')[0])
    await click(page, 'Later', 'main')
    await page.waitForFunction(() => location.search.includes('from='))
    await page.waitForFunction(b => document.querySelector('nav[aria-label="Dates shown"]').parentElement.innerText.split('\n')[0] !== b, {}, before)
    await click(page, 'Today', 'main')
    await page.waitForFunction(() => !location.search.includes('from='))
  })

  await step(page, 'documents: type chips filter the list', async () => {
    await open(page, `/students/${S}?tab=documents`)
    const groups = await page.$$eval('[aria-label="Show documents of type"] button', bs => bs.map(b => b.innerText.replace(/\s+/g, ' ').trim()))
    if (groups.length > 2) {
      const label = groups[1].replace(/ \d+$/, '')
      await page.$$eval('[aria-label="Show documents of type"] button', bs => bs[1].click())
      await page.waitForFunction(l => [...document.querySelectorAll('main p.text-sm.font-medium')].every(p => p.innerText === l || !p.closest('.space-y-2')), {}, label)
    }
  })

  await step(page, 'export brief intros: written / not written filter the list', async () => {
    const written = sql(`select s.first_name || ' ' || s.surname from public.students s where exists (select 1 from public.student_brief_intro b where b.student_id = s.id) limit 1`)
    const notWritten = sql(`select s.first_name || ' ' || s.surname from public.students s where not exists (select 1 from public.student_brief_intro b where b.student_id = s.id) order by created_at desc limit 1`)
    await open(page, '/students/brief-intros/export?intro=yes')
    const yes = await page.$$eval('tbody tr', rows => rows.map(r => r.innerText))
    assert(yes.length > 0 && yes.every(r => r.includes('Written')), 'written filter shows unwritten')
    if (written) await seeText(page, 'Introduction written')
    await open(page, '/students/brief-intros/export?intro=no')
    const no = await page.$$eval('tbody tr', rows => rows.map(r => r.innerText))
    assert(no.length > 0 && no.every(r => r.includes('Not written')), 'not-written filter shows written')
    assert(notWritten, 'no unwritten student to check')
    const bar = await page.$eval('main .sticky.bottom-0', el => getComputedStyle(el).position)
    assert(bar === 'sticky', 'export bar not sticky')
  })

  await step(page, 'current schools: explains itself, one Add button on an empty search', async () => {
    await open(page, '/students/present-schools')
    await seeText(page, "Students' current schools")
    await seeText(page, 'Not the schools they apply to')
    await page.type('input[type="search"], main input', 'zzqqxx-no-school')
    await seeText(page, 'No school matches')
    const adds = await page.$$eval('main button', bs => bs.filter(b => /^Add (this )?school/.test(b.innerText.trim())).length)
    assert(adds === 1, `${adds} Add buttons`)
  })

  const junior = await signIn(browser, 'junior@aa.test')
  await step(junior.page, 'read-only staff can download documents but not upload or delete', async () => {
    await open(junior.page, `/students/${S}?tab=documents`)
    await notSeeText(junior.page, 'Choose files or drop them here')
    const deletes = await junior.page.$$eval('main button[aria-label="Delete"]', bs => bs.length)
    assert(deletes === 0, `${deletes} delete buttons`)
  })
} finally {
  await browser.close()
}
process.exitCode = summary()
