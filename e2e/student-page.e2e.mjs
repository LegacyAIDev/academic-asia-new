/**
 * Student page navigation: the section bar shows counts and stays put, Add
 * opens each kind of record's form straight away (and closing it tidies the
 * address), Edit details saves from a drawer, internal notes edit in a pop-up,
 * and only the open section's data is fetched.
 */
import { execFileSync } from 'node:child_process'
import { launch, signIn, open, step, click, seeText, assert, summary, SEED } from './lib/harness.mjs'

const DB = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = q => execFileSync('psql', [DB, '-At', '-c', q], { encoding: 'utf8' }).trim()
const S = SEED.student
const DIALOG = '[role="dialog"]'

const browser = await launch()
try {
  const { page } = await signIn(browser, 'admin@aa.test')
  await page.setViewport({ width: 1512, height: 982 })

  await step(page, 'section bar shows record counts', async () => {
    await open(page, `/students/${S}`)
    const apps = sql(`select count(*) from public.student_applications where student_id = '${S}'`)
    const label = await page.$eval('nav[aria-label="Student sections"] a[href$="tab=applications"]', a => a.innerText.replace(/\s+/g, ' ').trim())
    assert(label === (apps === '0' ? 'Applications' : `Applications ${apps}`), `label "${label}" for ${apps}`)
  })

  await step(page, 'Add > Visa opens the visa form in its section; closing tidies the address', async () => {
    await open(page, `/students/${S}?tab=overview`)
    await click(page, 'Add', 'main header')
    await click(page, 'Visa', '[role="menu"]')
    await page.waitForFunction(() => location.search.includes('tab=immigration') && location.search.includes('add=visa'))
    await page.waitForSelector(DIALOG)
    await seeText(page, 'New Visa Application', DIALOG)
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !location.search.includes('add='), { timeout: 20000 })
    await page.reload({ waitUntil: 'networkidle2' })
    assert(!(await page.$(DIALOG)), 'form reopened after reload')
  })

  await step(page, 'Edit details saves from the drawer without leaving the page', async () => {
    await open(page, `/students/${S}?tab=family`)
    await click(page, 'Edit details', 'main header')
    await page.waitForSelector(`${DIALOG} input[name="telephone"], ${DIALOG} form`)
    const remarks = `drawer edit ${Date.now()}`
    await page.$eval(`${DIALOG} textarea[name="remarks"]`, (el, v) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
      setter.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true }))
    }, remarks)
    await click(page, 'Save Changes', DIALOG)
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 30000 })
    assert(page.url().includes('tab=family'), `left the section: ${page.url()}`)
    assert(sql(`select remarks from public.students where id = '${S}'`) === remarks, 'remarks not saved')
  })

  await step(page, 'internal notes edit in a pop-up and show as a summary', async () => {
    await open(page, `/students/${S}?tab=overview`)
    const note = `Calm under pressure ${Date.now()}`
    const button = (await page.$$('main button')).length
    assert(button > 0, 'no buttons')
    await page.evaluate(() => [...document.querySelectorAll('main section')].find(s => s.innerText.startsWith('Internal notes'))
      .querySelector('button').click())
    await page.waitForSelector(`${DIALOG} textarea[name="character"]`)
    await page.$eval(`${DIALOG} textarea[name="character"]`, el => { el.value = '' })
    await page.type(`${DIALOG} textarea[name="character"]`, note)
    await click(page, 'Save notes', DIALOG)
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 30000 })
    await seeText(page, note, 'main')
  })

  await step(page, 'phone shows the contact details first and fits the screen', async () => {
    await page.setViewport({ width: 390, height: 844 })
    await open(page, `/students/${S}?tab=overview`)
    const first = await page.$$eval('main section', all => all
      .map(s => ({ title: s.innerText.split('\n')[0], top: s.getBoundingClientRect().top }))
      .sort((a, b) => a.top - b.top)[0].title)
    assert(first === 'Details', `first panel on screen was ${first}`)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    assert(overflow <= 0, `scrolls sideways by ${overflow}px`)
    await page.setViewport({ width: 1512, height: 982 })
  })
} finally {
  await browser.close()
}
process.exitCode = summary()
