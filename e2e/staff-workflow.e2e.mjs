/**
 * End-to-end check of staff management as an Admin: add a staff member in the
 * drawer (the access level is required), see them in the list and what they
 * can open, sign in as them, edit their details, reset their password, and
 * deactivate them so they can no longer sign in, then reactivate them.
 * Needs psql on PATH and E2E_DB_URL for the local test database.
 */
import { execFileSync } from 'node:child_process'
import { assert, BASE, choose, click, launch, open, seeText, signIn, step, summary } from './lib/harness.mjs'

const DB = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = query => execFileSync('psql', [DB, '-X', '-A', '-t', '-q', '-c', query], { encoding: 'utf8' }).trim()
const EMAIL = 'uat.newstaff@aa.test'
const PASSWORD = `Uat-${Math.random().toString(36).slice(2, 10)}`
const NEW_PASSWORD = `Uat-${Math.random().toString(36).slice(2, 10)}`
const DIALOG = '[role="dialog"]'
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))

sql(`delete from auth.users where email = '${EMAIL}'`)

/** Tries to sign in as the new staff member in a fresh browser; true when it gets past the login page. */
async function canSignIn(browser, password) {
  const context = await browser.createBrowserContext()
  const other = await context.newPage()
  await other.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 120000 })
  await other.type('#email', EMAIL)
  await other.type('#password', password)
  await other.click('button[type="submit"]')
  await other.waitForFunction(() => !location.pathname.startsWith('/login') || document.querySelector('[role="alert"], .text-destructive'), { polling: 200, timeout: 60000 }).catch(() => {})
  await pause(500)
  const signedIn = !other.url().includes('/login')
  await context.close()
  return signedIn
}

const browser = await launch()
try {
  const { page } = await signIn(browser, 'admin@aa.test')
  let staffId = null

  await step(page, 'old links to the add and edit pages land on the drawer', async () => {
    await open(page, '/staff/new')
    assert(page.url().includes('/staff?add=staff'), `landed on ${page.url()}`)
    await seeText(page, 'Add a staff member', DIALOG)
  })

  await step(page, 'adding without an access level asks for one', async () => {
    await page.waitForSelector(`${DIALOG} input[name="first_name"]`)
    await pause(500) // the drawer slides in from the side
    await page.type(`${DIALOG} input[name="first_name"]`, 'Una')
    await page.type(`${DIALOG} input[name="surname"]`, 'Tester')
    await page.type(`${DIALOG} input[name="email_1"]`, EMAIL)
    await page.type(`${DIALOG} input[name="password"]`, PASSWORD)
    await click(page, 'Add staff member', DIALOG)
    await seeText(page, 'Choose an access level', DIALOG)
  })

  await step(page, 'with an access level chosen, the staff member is added', async () => {
    await choose(page, '#staff-access-level', 'Staff')
    await seeText(page, 'Advanced: change access for single areas', DIALOG)
    await Promise.all([
      page.waitForFunction(() => /^\/staff\/[0-9a-f-]{36}$/.test(location.pathname), { polling: 100, timeout: 60000 }),
      click(page, 'Add staff member', DIALOG),
    ])
    staffId = page.url().split('/').pop()
    await seeText(page, 'Una Tester')
    await seeText(page, 'Set by the Staff level')
  })

  await step(page, 'they appear in the staff list, and the whole row opens them', async () => {
    await open(page, '/staff')
    await seeText(page, 'Una Tester')
    const box = await page.evaluate(() => {
      const row = [...document.querySelectorAll('tbody tr')].find(r => r.innerText.includes('Una Tester'))
      const cell = row.lastElementChild.getBoundingClientRect()
      return { x: cell.x + cell.width / 2, y: cell.y + cell.height / 2 }
    })
    await Promise.all([
      page.waitForFunction(id => location.pathname === `/staff/${id}`, { polling: 100, timeout: 60000 }, staffId),
      page.mouse.click(box.x, box.y),
    ])
  })

  await step(page, 'the filters are accurate: full-name search, access level with counts, no empty department filter', async () => {
    await open(page, '/staff?search=una%20tester')
    const names = () => page.$$eval('tbody tr', rows => rows.map(r => r.querySelector('td a')?.innerText.trim()))
    assert(JSON.stringify(await names()) === '["Una Tester"]', `search found ${await names()}`)
    await open(page, '/staff')
    const expected = Number(sql(`select count(*) from public.profiles where admin_level = 6`))
    await page.click('button[aria-label="Access level"]')
    await seeText(page, `Staff (${expected})`, '[role="listbox"]')
    await page.keyboard.press('Escape')
    await open(page, '/staff?level=6')
    assert((await names()).length === expected, `level filter showed ${(await names()).length}, expected ${expected}`)
    const anyDepartment = sql(`select count(*) from public.profiles where department_id is not null`) !== '0'
    assert(Boolean(await page.$('button[aria-label="Department"]')) === anyDepartment, 'department filter shown without anyone in a department')
  })

  await step(page, 'the new staff member can sign in with the password set', async () => {
    assert(await canSignIn(browser, PASSWORD), 'could not sign in')
  })

  await step(page, 'an admin edits their surname in the drawer', async () => {
    await open(page, `/staff/${staffId}`)
    await click(page, 'Edit details')
    await page.waitForSelector(`${DIALOG} input[name="surname"]`)
    await pause(500)
    await page.$eval(`${DIALOG} input[name="surname"]`, el => el.select())
    await page.keyboard.press('Backspace')
    await page.type(`${DIALOG} input[name="surname"]`, 'Checked')
    await click(page, 'Save changes', DIALOG)
    await seeText(page, 'Una Checked')
    assert(sql(`select surname from public.profiles where id = '${staffId}'`) === 'Checked', 'surname not saved')
  })

  await step(page, 'Reset password sets a new one that works', async () => {
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { polling: 100 })
    await page.click('button[aria-label="More actions"]')
    await click(page, 'Reset password', '[role="menu"]')
    await page.waitForSelector('#staff-new-password')
    await page.type('#staff-new-password', NEW_PASSWORD)
    await click(page, 'Set password', DIALOG)
    await seeText(page, 'New password set')
    assert(await canSignIn(browser, NEW_PASSWORD), 'the new password does not work')
  })

  await step(page, 'a deactivated staff member cannot sign in', async () => {
    await page.click('button[aria-label="More actions"]')
    await click(page, 'Deactivate', '[role="menu"]')
    await click(page, 'Deactivate', '[role="alertdialog"]')
    await seeText(page, 'Deactivated')
    assert(!(await canSignIn(browser, NEW_PASSWORD)), 'still able to sign in')
  })

  await step(page, 'reactivating lets them sign in again', async () => {
    await page.click('button[aria-label="More actions"]')
    await click(page, 'Reactivate', '[role="menu"]')
    await click(page, 'Reactivate', '[role="alertdialog"]')
    await seeText(page, 'Can sign in')
    assert(await canSignIn(browser, NEW_PASSWORD), 'could not sign in after reactivating')
  })
} finally {
  sql(`delete from auth.users where email = '${EMAIL}'`)
  await browser.close()
}
process.exit(summary() ? 1 : 0)
