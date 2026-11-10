/**
 * End-to-end check of staff management as an Admin: create a staff member,
 * see them in the list, sign in as them, and edit their details.
 * Needs psql on PATH and E2E_DB_URL for the local test database.
 */
import { execFileSync } from 'node:child_process'
import { assert, BASE, launch, open, seeText, signIn, step, summary } from './lib/harness.mjs'

const DB = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = query => execFileSync('psql', [DB, '-X', '-A', '-t', '-q', '-c', query], { encoding: 'utf8' }).trim()
const EMAIL = 'uat.newstaff@aa.test'
const PASSWORD = `Uat-${Math.random().toString(36).slice(2, 10)}`

sql(`delete from auth.users where email = '${EMAIL}'`)

const browser = await launch()
try {
  const { page } = await signIn(browser, 'admin@aa.test')
  let staffId = null

  await step(page, 'an admin creates a staff member', async () => {
    await open(page, '/staff/new')
    await page.type('input[name="first_name"]', 'Una')
    await page.type('input[name="surname"]', 'Tester')
    await page.type('input[name="email_1"]', EMAIL)
    await page.type('input[name="password"]', PASSWORD)
    await Promise.all([
      page.waitForFunction(() => /^\/staff\/[0-9a-f-]{36}$/.test(location.pathname), { polling: 100, timeout: 60000 }),
      page.click('main button[type="submit"]'),
    ])
    staffId = page.url().split('/').pop()
    await seeText(page, 'Una Tester')
  })

  await step(page, 'they appear in the staff list', async () => {
    await open(page, '/staff')
    await seeText(page, 'Una Tester')
  })

  await step(page, 'the new staff member can sign in with the password set', async () => {
    const context = await browser.createBrowserContext()
    const other = await context.newPage()
    await other.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 120000 })
    await other.type('#email', EMAIL)
    await other.type('#password', PASSWORD)
    await Promise.all([other.waitForNavigation({ waitUntil: 'networkidle2', timeout: 120000 }), other.click('button[type="submit"]')])
    const url = other.url()
    await context.close()
    assert(!url.includes('/login'), `still on ${url}`)
  })

  await step(page, 'an admin edits their surname', async () => {
    await open(page, `/staff/${staffId}/edit`)
    await page.$eval('input[name="surname"]', el => el.select())
    await page.keyboard.press('Backspace')
    await page.type('input[name="surname"]', 'Checked')
    await Promise.all([
      page.waitForFunction(id => location.pathname === `/staff/${id}`, { polling: 100, timeout: 60000 }, staffId),
      page.click('main button[type="submit"]'),
    ])
    await seeText(page, 'Una Checked')
    assert(sql(`select surname from public.profiles where id = '${staffId}'`) === 'Checked', 'surname not saved')
  })
} finally {
  await browser.close()
}
process.exit(summary() ? 1 : 0)
