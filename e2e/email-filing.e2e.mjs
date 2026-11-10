/**
 * End-to-end check of email filing (Phase 1, meeting note 3; EF-01 to EF-26).
 * Needs the seeded local stack described in e2e/lib/harness.mjs and the
 * fixtures folder E2E_FIXTURES with offer.eml, sent.msg and "Printed school reply.pdf".
 */
import path from 'node:path'
import { assert, choose, click, launch, notSeeText, open, SEED, seeText, shot, signIn, step, summary } from './lib/harness.mjs'

const FIX = process.env.E2E_FIXTURES ?? '/tmp/aa-localdb/fixtures'
const studentTab = `/students/${SEED.student}?tab=communications`
const DIALOG = '[role="dialog"]'

async function attach(page, file) {
  const input = await page.waitForSelector(`${DIALOG} input[type="file"]`)
  await input.uploadFile(path.join(FIX, file))
}

async function fileOne(page, file, after) {
  await click(page, 'File email')
  await attach(page, file)
  await page.waitForSelector(`${DIALOG} input[id$="-subject"]`)
  if (after) await after()
  await click(page, 'File email', DIALOG)
}

async function openEmail(page, subject) {
  await click(page, subject, 'table')
  await page.waitForFunction(t => document.querySelector('[role="dialog"]')?.innerText.includes(t), {}, 'Filed on')
}

const browser = await launch()
try {
  // ---- Staff (level 6): Students write, Schools read ----
  const { page } = await signIn(browser, 'staff@aa.test')
  page.on('dialog', d => d.accept())

  await step(page, 'empty Communications tab offers File email', async () => {
    await open(page, studentTab)
    await seeText(page, 'Nothing filed yet')
    await seeText(page, 'File email', 'main')
  })

  await step(page, 'eml is read in the browser and pre-fills the form', async () => {
    await click(page, 'File email')
    await attach(page, 'offer.eml')
    await page.waitForFunction(() => document.querySelector('[role="dialog"] input[id$="-subject"]')?.value === 'Year 9 entry – confirmed')
    const from = await page.$eval(`${DIALOG} input[id$="-from"]`, el => el.value)
    assert(from === 'Mrs Chan <mrs.chan@gmail.com>', `from was ${from}`)
    await seeText(page, '1 attachment', DIALOG)
    await seeText(page, 'report.pdf', DIALOG)
  })

  await step(page, 'choosing the application fills in its school (D4) and filing saves it', async () => {
    await choose(page, `${DIALOG} button[id$="-application"]`, 'Headington School · 2027 entry')
    await seeText(page, 'Headington School', DIALOG)
    await click(page, 'File email', DIALOG)
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'))
    await seeText(page, 'Year 9 entry – confirmed', 'table')
    await shot(page, 'email-01-filed-eml')
  })

  await step(page, 'the tab shows the live email count', async () => {
    await open(page, studentTab)
    const label = await page.$eval('a[href$="tab=communications"]', el => el.innerText)
    assert(/Communications\s*1/.test(label), `tab label was "${label}"`)
  })

  await step(page, 'viewer shows header, links and a sandboxed body without script or tracker', async () => {
    await openEmail(page, 'Year 9 entry – confirmed')
    await seeText(page, 'Mrs Chan <mrs.chan@gmail.com>', DIALOG)
    await seeText(page, 'Lucas Ng', DIALOG)
    await seeText(page, 'Headington School · 2027 entry', DIALOG)
    await seeText(page, 'Filed by Sam Staff', DIALOG)
    const frame = await page.$eval(`${DIALOG} iframe`, el => ({ sandbox: el.getAttribute('sandbox'), doc: el.getAttribute('srcdoc') }))
    assert(frame.sandbox === 'allow-popups allow-popups-to-escape-sandbox', `sandbox ${frame.sandbox}`)
    assert(frame.doc.includes('<b>confirm</b>'), 'body missing')
    assert(!frame.doc.includes('<script') && !frame.doc.includes('tracker.example.com'), 'unsafe content in body')
    await shot(page, 'email-02-viewer')
  })

  await step(page, 'attachment opens and the original downloads, both through short-lived signed links', async () => {
    try {
      // A PDF attachment opens in a new tab.
      const opened = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('no tab opened for the attachment')), 15000)
        browser.once('targetcreated', target => { clearTimeout(timer); resolve(target) })
      })
      await click(page, 'report.pdf', DIALOG, { prefix: true })
      const target = await opened
      const deadline = Date.now() + 10000
      while (!target.url().includes('/storage/') && Date.now() < deadline) await new Promise(r => setTimeout(r, 100))
      const url = target.url()
      await (await target.page().catch(() => null))?.close().catch(() => {})
      await page.bringToFront()
      assert(url.includes('/storage/v1/object/sign/filed-emails/emails/'), `attachment opened ${url}`)
      const pdf = await fetch(url)
      assert(pdf.ok, `attachment link answered ${pdf.status}`)
      assert(new TextDecoder().decode(new Uint8Array(await pdf.arrayBuffer()).slice(0, 5)) === '%PDF-', 'attachment is not the PDF')

      // The original is a download: catch the download instead of a tab.
      const cdp = await browser.target().createCDPSession()
      await cdp.send('Browser.setDownloadBehavior', { behavior: 'deny', eventsEnabled: true })
      const download = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('no download started for the original')), 15000)
        cdp.once('Browser.downloadWillBegin', event => { clearTimeout(timer); resolve(event) })
      })
      await click(page, 'Download original', DIALOG)
      const event = await download
      assert(event.url.includes('/storage/v1/object/sign/filed-emails/emails/') && event.suggestedFilename === 'offer.eml',
        `download was ${event.suggestedFilename} from ${event.url}`)
      const original = await fetch(event.url)
      assert((await original.text()).includes('Message-ID: <abc123@mail.example.com>'), 'downloaded original differs')
    } finally {
      await page.keyboard.press('Escape')
    }
  })

  await step(page, 'filing the same email again is refused (EF-09)', async () => {
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { polling: 100 })
    await click(page, 'File email')
    await attach(page, 'offer.eml')
    await page.waitForSelector(`${DIALOG} input[id$="-subject"]`)
    await click(page, 'File email', DIALOG)
    await seeText(page, 'Already filed here: "Year 9 entry – confirmed"', DIALOG)
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'))
  })

  await step(page, 'an Outlook .msg is read in the browser and filed', async () => {
    await fileOne(page, 'sent.msg', async () => {
      await page.waitForFunction(() => document.querySelector('[role="dialog"] input[id$="-subject"]')?.value === 'Sent time')
      await notSeeText(page, 'could not be read here', DIALOG)
    })
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'))
    await seeText(page, 'Sent time', 'table')
  })

  await step(page, 'a PDF is filed with the subject staff type', async () => {
    await fileOne(page, 'Printed school reply.pdf', async () => {
      await seeText(page, 'A PDF cannot be read for its details', DIALOG)
    })
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'))
    await seeText(page, 'Printed school reply', 'table')
  })

  await step(page, 'a typed record is saved and found by a word deep in its text (EF-08, EF-16)', async () => {
    await click(page, 'Log a call or meeting')
    await page.type(`${DIALOG} input[id$="-subject"]`, 'Phone call follow-up')
    await page.type(`${DIALOG} #email-record-body`, `${'Called the mother about boarding. '.repeat(40)}Remember the zebracrossing form.`)
    await click(page, 'Save record', DIALOG)
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'))
    await seeText(page, 'Phone call follow-up', 'table')
    await page.type('input[aria-label="Search emails"]', 'zebracrossing')
    await page.waitForFunction(() => document.querySelectorAll('table tbody tr').length === 1)
    await seeText(page, 'Phone call follow-up', 'table')
    await click(page, 'Clear filters')
  })

  await step(page, 'archive hides an email; Show archived and Restore bring it back (D5)', async () => {
    await openEmail(page, 'Phone call follow-up')
    await click(page, 'Archive', DIALOG)
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'))
    await page.waitForFunction(() => !document.querySelector('table')?.innerText.includes('Phone call follow-up'))
    await page.click('#emails-archived')
    await seeText(page, 'Phone call follow-up', 'table')
    await openEmail(page, 'Phone call follow-up')
    await click(page, 'Restore', DIALOG)
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'))
  })

  await step(page, 'edit corrects the subject and records who edited it (EF-21, EF-23)', async () => {
    await open(page, studentTab)
    await openEmail(page, 'Sent time')
    await click(page, 'Edit', DIALOG)
    await page.waitForFunction(() => document.querySelector('[role="dialog"] h2')?.innerText === 'Edit email details')
    const input = await page.$(`${DIALOG} input[id$="-subject"]`)
    await input.evaluate(el => el.select())
    await input.type('Sent time (corrected)')
    await click(page, 'Save changes', DIALOG)
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'))
    await seeText(page, 'Sent time (corrected)', 'table')
    await openEmail(page, 'Sent time (corrected)')
    await seeText(page, 'Edited by Sam Staff', DIALOG)
    await notSeeText(page, 'Delete for good', DIALOG)
    await page.keyboard.press('Escape')
  })

  await step(page, 'the school page lists the email filed through its application, with the student', async () => {
    await open(page, `/schools/${SEED.headington}?tab=communications`)
    await seeText(page, 'Year 9 entry – confirmed', 'table')
    await seeText(page, 'Lucas Ng', 'table')
    await notSeeText(page, 'File email')
    await shot(page, 'email-03-school-tab')
  })

  await step(page, 'the application page shows its emails', async () => {
    await open(page, `/students/${SEED.student}/applications/${SEED.application}`)
    await seeText(page, 'Emails')
    await seeText(page, 'Year 9 entry – confirmed', 'table')
  })

  // ---- Junior (level 7): read only ----
  const junior = (await signIn(browser, 'junior@aa.test')).page
  await step(junior, 'read-only staff can read emails but not file, edit or archive', async () => {
    await open(junior, studentTab)
    await seeText(junior, 'Year 9 entry – confirmed', 'table')
    await notSeeText(junior, 'File email')
    await notSeeText(junior, 'Log a call or meeting')
    await openEmail(junior, 'Year 9 entry – confirmed')
    await notSeeText(junior, 'Archive', DIALOG)
    await notSeeText(junior, 'Edit', `${DIALOG} button`)
  })

  // ---- Manager (level 3): permanent delete ----
  const manager = (await signIn(browser, 'manager@aa.test')).page
  manager.on('dialog', d => d.accept())
  await step(manager, 'a manager can delete an email for good', async () => {
    await open(manager, studentTab)
    await openEmail(manager, 'Printed school reply')
    await click(manager, 'Delete for good', DIALOG)
    await click(manager, 'Delete', '[role="alertdialog"]')
    await manager.waitForFunction(() => !document.querySelector('table')?.innerText.includes('Printed school reply'))
  })
} finally {
  await browser.close()
}
process.exit(summary() ? 1 : 0)
