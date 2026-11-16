/**
 * End-to-end check of online registration (client feedback, 13 Nov): staff
 * make a one-use link for a family; the family, not signed in, fills in the
 * form (with errors named beside the fields), and the student appears with
 * status New and their parent; the link then no longer works.
 * Needs psql on PATH and E2E_DB_URL for the local test database.
 */
import { execFileSync } from 'node:child_process'
import { assert, BASE, choose, click, launch, open, seeText, signIn, step, summary } from './lib/harness.mjs'

const DB = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = query => execFileSync('psql', [DB, '-X', '-A', '-t', '-q', '-c', query], { encoding: 'utf8' }).trim()
const DIALOG = '[role="dialog"]'
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))

function reset() {
  sql(`delete from public.students where surname = 'REGTEST'`)
  sql(`delete from public.registration_links where note like 'UAT%'`)
}
reset()

const browser = await launch()
let url = null
try {
  const { page } = await signIn(browser, 'manager@aa.test')

  await step(page, 'staff make a registration link for a family', async () => {
    await open(page, '/students')
    await click(page, 'Registration link')
    await page.waitForSelector('#registration-note')
    await pause(300)
    await page.type('#registration-note', 'UAT Wong family')
    await click(page, 'Create link', DIALOG)
    await page.waitForSelector('#registration-url')
    url = await page.$eval('#registration-url', el => el.value)
    assert(url.startsWith(`${BASE}/register/`), `link: ${url}`)
    assert(sql(`select count(*) from public.registration_links where note = 'UAT Wong family' and used_at is null`) === '1', 'link not stored')
    const token = url.split('/').pop()
    assert(sql(`select count(*) from public.registration_links where token_hash = '${token}'`) === '0', 'the secret itself is stored')
  })

  const context = await browser.createBrowserContext()
  const family = await context.newPage()
  await family.setViewport({ width: 1280, height: 900 })

  await step(family, 'the family opens it without signing in', async () => {
    await family.goto(url, { waitUntil: 'networkidle2', timeout: 120000 })
    assert(!family.url().includes('/login'), `sent to ${family.url()}`)
    await seeText(family, 'Student registration')
  })

  await step(family, 'an incomplete form names what is missing', async () => {
    await click(family, 'Send registration')
    await seeText(family, 'Enter the student\'s first name')
    await seeText(family, 'Give at least one parent\'s mobile or email')
    await seeText(family, 'Please agree so we can keep these details')
  })

  await step(family, 'a complete form creates the student, status New, with their mother', async () => {
    await family.type('#first_name', 'Regan')
    await family.type('#surname', 'Regtest')
    await choose(family, '#gender', 'Female')
    await choose(family, '#entry_year', `September ${new Date().getFullYear() + 2}`)
    await family.type('#mother_name', 'Wong Mei Ling')
    await family.type('#mother_mobile', '9876 5432')
    await family.type('#notes', 'Interested in Benenden')
    await family.click('#consent')
    await click(family, 'Send registration')
    await seeText(family, 'We have received the registration')
    const row = sql(`select s.status_id || '|' || s.entry_year || '|' || (s.remarks like 'Registered online%') from public.students s where s.surname = 'REGTEST'`)
    assert(row === `1|${new Date().getFullYear() + 2}|true`, `student: ${row}`)
    const mother = sql(`select c.first_name || '|' || c.surname || '|' || c.mobile from public.student_contacts c join public.students s on s.id = c.student_id
      join public.contact_relationships r on r.id = c.relationship_id where s.surname = 'REGTEST' and r.code = 'mother'`)
    assert(mother === 'Wong Mei|Ling|9876 5432', `mother: ${mother}`)
    assert(sql(`select count(*) from public.registration_links where note = 'UAT Wong family' and used_at is not null and student_id is not null`) === '1', 'link not marked used')
  })

  await step(family, 'the link cannot be used again, nor can a made-up one', async () => {
    await family.goto(url, { waitUntil: 'networkidle2' })
    await seeText(family, 'This link can no longer be used')
    await family.goto(`${BASE}/register/${'x'.repeat(43)}`, { waitUntil: 'networkidle2' })
    await seeText(family, 'This link can no longer be used')
  })
  await context.close()

  await step(page, 'staff see the new student in the list', async () => {
    await open(page, '/students?search=Regtest')
    await seeText(page, 'Regan REGTEST')
    await seeText(page, 'New')
  })
} finally {
  reset()
  await browser.close()
}
process.exit(summary() ? 1 : 0)
