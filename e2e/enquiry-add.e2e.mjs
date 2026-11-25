/**
 * End-to-end check of adding an enquiry (client request, 23 Nov): "Add student"
 * offers a quick enquiry or the full form; the enquiry form saves the student
 * as an Enquiry with a student code, and a named parent as a family contact
 * holding the phone and email.
 * Needs psql on PATH and E2E_DB_URL for the local test database.
 */
import { execFileSync } from 'node:child_process'
import { assert, choose, click, launch, open, seeText, signIn, step, summary } from './lib/harness.mjs'

const DB = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = query => execFileSync('psql', [DB, '-X', '-A', '-t', '-q', '-c', query], { encoding: 'utf8' }).trim()
const DIALOG = '[role="dialog"]'
const SURNAME = 'ENQTEST'

const reset = () => sql(`delete from public.students where surname = '${SURNAME}'`)
reset()

const studentRow = first => sql(`select st.code || '|' || coalesce(s.entry_year::text, '-') || '|' || coalesce(s.lead_source_category, '-') || '|' ||
  coalesce(s.lead_source_referral_detail, '-') || '|' || coalesce(s.remarks, '-') || '|' || coalesce(s.mobile, '-') || '|' || coalesce(s.email, '-') || '|' || (s.student_code is not null)
  from public.students s join public.student_statuses st on st.id = s.status_id where s.surname = '${SURNAME}' and s.first_name = '${first}'`)
const contactRow = first => sql(`select coalesce(r.code, '-') || '|' || c.first_name || '|' || coalesce(c.mobile, '-') || '|' || coalesce(c.email_1, '-')
  from public.student_contacts c join public.students s on s.id = c.student_id left join public.contact_relationships r on r.id = c.relationship_id
  where s.surname = '${SURNAME}' and s.first_name = '${first}'`)

async function openEnquiryForm(page) {
  await click(page, 'Add student', 'main header')
  await click(page, 'Add enquiry', '[role="menu"]', { prefix: true })
  await page.waitForSelector(`${DIALOG} #enquiry-first-name`)
  await new Promise(resolve => setTimeout(resolve, 400))
}

async function save(page) {
  await Promise.all([
    page.waitForFunction(() => /^\/students\/[0-9a-f-]{36}$/.test(location.pathname), { polling: 100, timeout: 60000 }),
    click(page, 'Add enquiry', DIALOG),
  ])
}

const browser = await launch()
try {
  const { page } = await signIn(browser, 'manager@aa.test')

  await step(page, 'Add student offers a quick enquiry or the full new-student form', async () => {
    await open(page, '/students')
    await click(page, 'Add student', 'main header')
    await seeText(page, 'Add enquiry', '[role="menu"]')
    await seeText(page, 'Add new student', '[role="menu"]')
    await click(page, 'Add new student', '[role="menu"]', { prefix: true })
    await page.waitForSelector(`${DIALOG} #surname`, { timeout: 60000 })
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { polling: 100 })
  })

  await step(page, 'an enquiry with a parent saves the student as an Enquiry and the parent as family', async () => {
    await open(page, '/students')
    await openEnquiryForm(page)
    await page.type(`${DIALOG} #enquiry-first-name`, 'Mia')
    await page.type(`${DIALOG} #enquiry-surname`, SURNAME)
    await page.type(`${DIALOG} #enquiry-parent-name`, 'Mrs Chan')
    await choose(page, `${DIALOG} #enquiry-relationship`, 'Mother')
    await page.type(`${DIALOG} input[type="tel"]`, '9123 4567')
    await page.type(`${DIALOG} #enquiry-email`, 'mrs.chan@example.com')
    await choose(page, `${DIALOG} #enquiry-entry-year`, String(new Date().getFullYear() + 1))
    await choose(page, `${DIALOG} #enquiry-lead-source`, 'Referral')
    await page.waitForSelector(`${DIALOG} #enquiry-referral`)
    await page.type(`${DIALOG} #enquiry-referral`, 'Wong family')
    await page.type(`${DIALOG} #enquiry-remarks`, 'Asked about Year 9 boarding')
    await save(page)
    await seeText(page, 'Enquiry', 'main header')
    const student = studentRow('Mia')
    assert(student === `enquiry|${new Date().getFullYear() + 1}|referral|Wong family|Asked about Year 9 boarding|-|-|true`, `student: ${student}`)
    const contact = contactRow('Mia')
    assert(/^mother\|Mrs Chan\|\+852 ?9123 ?4567\|mrs\.chan@example\.com$/.test(contact), `contact: ${contact}`)
  })

  await step(page, 'with no parent named, the phone and email stay on the student', async () => {
    await open(page, '/students?add=enquiry')
    await page.waitForSelector(`${DIALOG} #enquiry-first-name`)
    await new Promise(resolve => setTimeout(resolve, 400))
    await page.type(`${DIALOG} #enquiry-first-name`, 'Leo')
    await page.type(`${DIALOG} #enquiry-surname`, SURNAME)
    await page.type(`${DIALOG} input[type="tel"]`, '6000 1111')
    await page.type(`${DIALOG} #enquiry-email`, 'leo@example.com')
    await save(page)
    const student = studentRow('Leo')
    assert(/^enquiry\|-\|-\|-\|-\|\+852 ?6000 ?1111\|leo@example\.com\|true$/.test(student), `student: ${student}`)
    assert(contactRow('Leo') === '', `unexpected contact: ${contactRow('Leo')}`)
  })

  await step(page, 'the name is required', async () => {
    await open(page, '/students?add=enquiry')
    await page.waitForSelector(`${DIALOG} #enquiry-first-name`)
    await new Promise(resolve => setTimeout(resolve, 400))
    await page.type(`${DIALOG} #enquiry-first-name`, 'Nobody')
    await click(page, 'Add enquiry', DIALOG)
    await new Promise(resolve => setTimeout(resolve, 1000))
    assert(await page.$(`${DIALOG} #enquiry-first-name`), 'the form closed without a surname')
    assert(sql(`select count(*) from public.students where first_name = 'Nobody'`) === '0', 'saved without a surname')
  })
} finally {
  reset()
  await browser.close()
}
process.exit(summary() ? 1 : 0)
