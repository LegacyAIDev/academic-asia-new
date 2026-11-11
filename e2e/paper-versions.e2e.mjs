/**
 * End-to-end check of entrance assessment paper versions (meeting note 11,
 * ASM-03, ASM-05): an exam officer replaces a paper with the school's updated
 * one, older files stay in the history with who uploaded them and when, and
 * only the current file is offered for printing or listed as a document.
 * Needs E2E_EXAM_ID (a seeded English Year 9 entrance exam of Headington) and
 * E2E_BOOKING_ID (an examination booking today whose papers include it).
 */
import path from 'node:path'
import { assert, click, launch, notSeeText, open, SEED, seeText, shot, signIn, step, summary } from './lib/harness.mjs'

const FIX = process.env.E2E_FIXTURES ?? '/tmp/aa-localdb/fixtures'
const DIALOG = '[role="dialog"]'
const examsTab = `/schools/${SEED.headington}?tab=entrance-exams`

async function openExamDialog(page) {
  await open(page, examsTab)
  await page.click('button[aria-label="Edit entrance exam: English"]')
  await seeText(page, 'Update entrance exam details', DIALOG)
}

async function newTabUrl(browser, page, trigger) {
  const opened = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('no tab opened')), 15000)
    browser.once('targetcreated', target => { clearTimeout(timer); resolve(target) })
  })
  await trigger()
  const target = await opened
  const deadline = Date.now() + 10000
  while (!target.url().includes('/storage/') && Date.now() < deadline) await new Promise(r => setTimeout(r, 100))
  const url = target.url()
  await (await target.page().catch(() => null))?.close().catch(() => {})
  await page.bringToFront()
  return url
}

const contentOf = async url => (await (await fetch(url)).text()).match(/English paper version (\d)/)?.[1]

const browser = await launch()
try {
  const { page } = await signIn(browser, 'manager@aa.test')

  await step(page, 'an exam officer attaches the first paper, shown as version 1 with who uploaded it', async () => {
    await openExamDialog(page)
    const input = await page.waitForSelector(`${DIALOG} input[type="file"]:not([aria-label])`)
    await input.uploadFile(path.join(FIX, 'english-v1.pdf'))
    await seeText(page, 'Version 1 · uploaded by Maggie Manager', DIALOG)
  })

  await step(page, 'replacing it keeps the earlier file in the history (ASM-05)', async () => {
    const replace = await page.waitForSelector(`${DIALOG} input[aria-label^="New version of"]`)
    await replace.uploadFile(path.join(FIX, 'english-v2.pdf'))
    await seeText(page, 'Version 2 · uploaded by Maggie Manager', DIALOG)
    await seeText(page, 'Earlier versions (1)', DIALOG)
    await click(page, 'Earlier versions (1)', DIALOG)
    await seeText(page, 'Version 1 · english-v1.pdf', 'ol[aria-label="Earlier versions"]')
    await seeText(page, 'replaced', 'ol[aria-label="Earlier versions"]')
    await shot(page, 'versions-01-history')
  })

  await step(page, 'the earlier version still opens, and the current file is the new one', async () => {
    const old = await newTabUrl(browser, page, () => page.click('button[aria-label="Open Version 1"]'))
    assert(await contentOf(old) === '1', 'earlier version did not open version 1')
    const current = await newTabUrl(browser, page, () => page.click(`${DIALOG} button[aria-label="Download file"]`))
    assert(await contentOf(current) === '2', 'current file is not version 2')
  })

  await step(page, 'a third version lists both earlier ones, newest first', async () => {
    await openExamDialog(page)
    const replace = await page.waitForSelector(`${DIALOG} input[aria-label^="New version of"]`)
    await replace.uploadFile(path.join(FIX, 'english-v3.pdf'))
    await seeText(page, 'Version 3 · uploaded by Maggie Manager', DIALOG)
    await click(page, 'Earlier versions (2)', DIALOG)
    await page.waitForFunction(() => document.querySelectorAll('ol[aria-label="Earlier versions"] li p.font-medium').length === 2, { polling: 100 })
    const rows = await page.$$eval('ol[aria-label="Earlier versions"] li p.font-medium', els => els.map(e => e.innerText))
    assert(rows.join(' | ') === 'Version 2 · english-v2.pdf | Version 1 · english-v1.pdf', `history was ${rows.join(' | ')}`)
  })

  await step(page, 'the Documents tab lists only the current paper', async () => {
    await open(page, `/schools/${SEED.headington}?tab=documents`)
    await seeText(page, 'english-v3.pdf')
    await notSeeText(page, 'english-v1.pdf')
    await notSeeText(page, 'english-v2.pdf')
  })

  await step(page, 'the exam desk offers only the current paper for printing', async () => {
    await open(page, '/exams')
    await seeText(page, 'Lucas Ng')
    await page.click('button[aria-label="Print the papers"]')
    await seeText(page, 'Papers for this examination', DIALOG)
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]').innerText.includes('Loading the papers'), { polling: 100 })
    await seeText(page, '1 uploaded')
    const links = await page.$$eval(`${DIALOG} a[target="_blank"]`, els => els.map(a => a.href))
    assert(links.length === 1, `expected one paper to print, got ${links.length}`)
    assert(await contentOf(links[0]) === '3', 'the printable paper is not the current version')
    await shot(page, 'versions-02-exam-desk-print')
  })

  await step(page, 'the exam team sees paper uploads in the school activity history', async () => {
    await open(page, `/schools/${SEED.headington}?tab=notes`)
    await seeText(page, 'Created exam paper · english-v3.pdf', 'ol[aria-label="Activity"]')
  })

  // ---- Outside the exam team ----
  const staff = (await signIn(browser, 'staff@aa.test')).page
  await step(staff, 'staff outside the exam team see neither the papers nor their history', async () => {
    await open(staff, examsTab)
    const editable = await staff.$('button[aria-label="Edit entrance exam: English"]')
    if (editable) {
      await editable.click()
      await seeText(staff, 'Papers are kept by the examination team.', DIALOG)
      await notSeeText(staff, 'Version', DIALOG)
    }
    await notSeeText(staff, 'english-v')
  })

  await step(staff, 'and paper uploads are left out of the school activity history they see', async () => {
    await open(staff, `/schools/${SEED.headington}?tab=notes`)
    await staff.waitForSelector('ol[aria-label="Activity"]')
    await notSeeText(staff, 'exam paper', 'ol[aria-label="Activity"]')
    await notSeeText(staff, 'english-v', 'ol[aria-label="Activity"]')
  })
} finally {
  await browser.close()
}
process.exit(summary() ? 1 : 0)
