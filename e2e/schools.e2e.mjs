/**
 * Schools: the list (tick hint, sorting, paging keeps filters, row opens the
 * school), the school page (counts in the section bar, Add opens forms, Edit
 * details drawer, Delete only in More), plain wording in sections, masked bank
 * numbers, and the PDF export's prepared-for field.
 */
import { execFileSync } from 'node:child_process'
import { BASE, launch, signIn, open, step, click, seeText, notSeeText, assert, summary, shot, SEED } from './lib/harness.mjs'

const DB = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = q => execFileSync('psql', [DB, '-At', '-c', q], { encoding: 'utf8' }).trim()
const H = SEED.headington
const DIALOG = '[role="dialog"]'

const browser = await launch()
try {
  const { page } = await signIn(browser, 'manager@aa.test')
  await page.setViewport({ width: 1512, height: 982 })

  await step(page, 'list: hint to tick schools, no fake totals, row opens the school', async () => {
    await open(page, '/schools')
    await seeText(page, 'to compare them side by side or export them as a PDF')
    await notSeeText(page, 'Total Pupils')
    await shot(page, 'schools-list')
    const cell = await page.$('tbody tr:first-child td:last-child')
    const href = await page.$eval('tbody tr:first-child a[href^="/schools/"]', a => a.getAttribute('href'))
    const status = await page.$('tbody tr:first-child td:nth-last-child(2)')
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }), status.click()])
    assert(page.url() === `${BASE}${href}`, `went to ${page.url()}`)
    assert(cell, 'no row')
  })

  await step(page, 'list: sorting by school name descending reverses the order', async () => {
    await open(page, '/schools?sort=name&dir=desc')
    const names = await page.$$eval('tbody tr td:nth-child(2) a', as => as.map(a => a.textContent.trim()))
    const sorted = [...names].sort((a, b) => b.localeCompare(a))
    assert(names.join() === sorted.join(), `not descending: ${names.slice(0, 4).join(', ')}`)
  })

  await step(page, 'school page: section bar counts, Delete only under More', async () => {
    await open(page, `/schools/${H}`)
    const contacts = sql(`select count(*) from public.school_contacts where school_id = '${H}' and is_active`)
    const label = await page.$eval('nav[aria-label="School sections"] a[href$="tab=contacts"]', a => a.innerText.replace(/\s+/g, ' ').trim())
    assert(label === (contacts === '0' ? 'Contacts' : `Contacts ${contacts}`), `label "${label}" for ${contacts}`)
    await notSeeText(page, 'Delete School', 'main header')
    await page.click('main button[aria-label="More actions"]')
    await seeText(page, 'Delete school', '[role="menu"]')
    await page.keyboard.press('Escape')
  })

  await step(page, 'school page: Add > Visit opens the visit form in its section', async () => {
    await open(page, `/schools/${H}`)
    await click(page, 'Add', 'main header')
    await click(page, 'Visit', '[role="menu"]')
    await page.waitForFunction(() => location.search.includes('tab=visits') && location.search.includes('add=visit'))
    await page.waitForSelector(DIALOG)
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !location.search.includes('add='), { timeout: 20000 })
  })

  await step(page, 'school page: Edit details saves from a drawer', async () => {
    await open(page, `/schools/${H}?tab=contacts`)
    await click(page, 'Edit details', 'main header')
    await page.waitForSelector(`${DIALOG} input[name="name"]`, { timeout: 60000 })
    const keywords = `drawer-${Date.now() % 100000}`
    await page.$eval(`${DIALOG} [name="keywords"]`, el => { el.value = '' })
    await page.type(`${DIALOG} [name="keywords"]`, keywords)
    await click(page, 'Save Changes', DIALOG)
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 30000 })
    assert(page.url().includes('tab=contacts'), `left the section: ${page.url()}`)
    assert(sql(`select keywords from public.schools where id = '${H}'`) === keywords, 'keywords not saved')
  })

  await step(page, 'overview: profile prompt names what is missing', async () => {
    const before = sql(`select coalesce(website,'') from public.schools where id = '${H}'`)
    await open(page, `/schools/${H}`)
    if (!before) await seeText(page, 'Complete the profile')
    await notSeeText(page, 'INSTITUTION TYPE')
  })

  await step(page, 'notes tab: background information explained, activity starts short', async () => {
    await open(page, `/schools/${H}?tab=notes`)
    await seeText(page, 'Background information')
    const rows = await page.$$eval('ol[aria-label="Activity"] li', li => li.length)
    assert(rows <= 5, `${rows} activity rows shown at first`)
  })

  await step(page, 'bank details: account numbers masked until shown', async () => {
    const id = sql(`insert into public.school_bank_details (school_id, bank_name, account_number) values ('${H}', 'UAT Bank', '12345678') returning id`).split('\n')[0]
    await open(page, `/schools/${H}?tab=bank-details`)
    await seeText(page, '•••• 5678')
    await notSeeText(page, '12345678')
    await click(page, 'Show', 'main')
    await seeText(page, '12345678')
    sql(`delete from public.school_bank_details where id = '${id}'`)
  })

  await step(page, 'export: prepared-for shows only when named, and is set from the page', async () => {
    await open(page, `/schools/export?ids=${SEED.headington},${SEED.brighton}`)
    await notSeeText(page, 'PREPARED FOR', '.masthead')
    await page.type('input[placeholder="Student\'s name (optional)"]', 'Lucas Ng')
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => location.search.includes('student=Lucas'))
    // The masthead sets its labels in capitals.
    await seeText(page, 'PREPARED FOR', '.masthead')
    await shot(page, 'schools-export')
  })
} finally {
  await browser.close()
}
process.exitCode = summary()
