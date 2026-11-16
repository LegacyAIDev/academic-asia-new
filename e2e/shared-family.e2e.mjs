/**
 * End-to-end check that brothers and sisters share their parents (client
 * feedback, 13 Nov): linking two siblings merges a parent both held into one
 * record and shows each child the other's parents; a change made from either
 * child shows on both; a new student linked to a sibling when added gets the
 * family's parents; and the one-off merge for families linked earlier works.
 * Needs psql on PATH and E2E_DB_URL for the local test database.
 */
import { execFileSync } from 'node:child_process'
import { assert, click, launch, open, seeText, signIn, step, summary } from './lib/harness.mjs'

const DB = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = query => execFileSync('psql', [DB, '-X', '-A', '-t', '-q', '-c', query], { encoding: 'utf8' }).trim()
const DIALOG = '[role="dialog"]'
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))

function reset() {
  sql(`delete from public.students where surname in ('SHAREFAM', 'MERGEFAM')`)
}
reset()
const rel = code => `(select id from public.contact_relationships where code = '${code}')`
const student = (first, surname, gender) =>
  sql(`insert into public.students (surname, first_name, gender, student_code) values ('${surname}', '${first}', '${gender}', 'S0${first.toUpperCase()}') returning id`).split('\n')[0]
const parent = (studentId, code, fields) => {
  const cols = Object.keys(fields).join(', ')
  const vals = Object.values(fields).map(v => `'${v}'`).join(', ')
  return sql(`insert into public.student_contacts (student_id, relationship_id, ${cols}) values ('${studentId}', ${rel(code)}, ${vals}) returning id`).split('\n')[0]
}

const amy = student('Amy', 'SHAREFAM', 'F')
const ben = student('Ben', 'SHAREFAM', 'M')
// The same mother recorded on both children, as before sharing existed; the father only on Amy.
parent(amy, 'mother', { first_name: 'Mei', surname: 'Chan', email_1: 'mei.sharefam@example.com' })
parent(ben, 'mother', { first_name: 'Mei', surname: 'Chan', email_1: 'mei.sharefam@example.com', mobile: '+852 9123 4567' })
const tom = parent(amy, 'father', { first_name: 'Tom', surname: 'Chan' })

const parentsOf = id => sql(`select count(*) from public.student_contacts c join public.contact_relationships r on r.id = c.relationship_id
  where c.student_id = '${id}' and r.code in ('mother', 'father', 'guardian')`)

const browser = await launch()
try {
  const { page } = await signIn(browser, 'manager@aa.test')

  await step(page, 'linking the siblings merges the mother both held into one record', async () => {
    await open(page, `/students/${ben}?tab=family`)
    await page.click('button[aria-label^="Link Amy SHAREFAM"]')
    for (let i = 0; i < 60 && Number(parentsOf(amy)) + Number(parentsOf(ben)) !== 2; i++) await pause(250)
    const mothers = sql(`select count(*) from public.student_contacts c join public.contact_relationships r on r.id = c.relationship_id
      where c.student_id in ('${amy}', '${ben}') and r.code = 'mother'`)
    assert(mothers === '1', `mother records: ${mothers}`)
    const mobile = sql(`select mobile from public.student_contacts c join public.contact_relationships r on r.id = c.relationship_id
      where c.student_id in ('${amy}', '${ben}') and r.code = 'mother'`)
    assert(mobile.replace(/\D/g, '').endsWith('91234567'), `the kept record lost the mobile: ${mobile}`)
  })

  await step(page, 'each child shows the family\'s parents, the shared ones marked', async () => {
    await open(page, `/students/${ben}?tab=family`)
    await seeText(page, 'Mei Chan')
    await seeText(page, 'Tom Chan')
    await seeText(page, 'Shared with Amy SHAREFAM')
    await open(page, `/students/${amy}?tab=family`)
    await seeText(page, 'Mei Chan')
    await seeText(page, 'Tom Chan')
  })

  await step(page, 'a change to a parent made from either child shows on both', async () => {
    await open(page, `/students/${ben}?tab=family`)
    await page.click(`article[aria-label="Tom Chan"] button[aria-label="Edit family member"]`)
    await page.waitForSelector(`${DIALOG} input[name="occupation"]`)
    await pause(500)
    await page.type(`${DIALOG} input[name="occupation"]`, 'Architect')
    await click(page, 'Save Changes', DIALOG)
    for (let i = 0; i < 60 && sql(`select occupation from public.student_contacts where id = '${tom}'`) !== 'Architect'; i++) await pause(250)
    assert(sql(`select occupation from public.student_contacts where id = '${tom}'`) === 'Architect', 'occupation not saved on the shared record')
    await open(page, `/students/${amy}?tab=family`)
    await seeText(page, 'Architect')
  })

  await step(page, 'a new student linked to a sibling when added gets the family\'s parents', async () => {
    await open(page, '/students?add=student')
    await page.waitForSelector(`${DIALOG} input[name="surname"]`)
    await pause(600)
    await page.type(`${DIALOG} input[name="first_name"]`, 'Cara')
    await page.type(`${DIALOG} input[name="surname"]`, 'SHAREFAM')
    await click(page, 'Already a student? Search by name or code', DIALOG)
    await page.waitForSelector('[cmdk-input]')
    await page.type('[cmdk-input]', 'Amy SHAREFAM')
    await page.waitForFunction(() => [...document.querySelectorAll('[cmdk-item]')].some(i => i.innerText.includes('Amy')), { polling: 100 })
    await page.evaluate(() => [...document.querySelectorAll('[cmdk-item]')].find(i => i.innerText.includes('Amy')).click())
    await seeText(page, 'They are this student', DIALOG)
    await Promise.all([
      page.waitForFunction(() => /^\/students\/[0-9a-f-]{36}$/.test(location.pathname), { polling: 100, timeout: 60000 }),
      click(page, 'Create Student', DIALOG),
    ])
    const cara = page.url().split('/').pop().split('?')[0]
    assert(sql(`select count(*) from public.student_contacts where student_id = '${cara}' and related_student_id = '${amy}'`) === '1', 'Cara is not linked to Amy')
    await open(page, `/students/${cara}?tab=family`)
    await seeText(page, 'Mei Chan')
    await seeText(page, 'Tom Chan')
    await seeText(page, 'Amy SHAREFAM')
  })

  await step(page, 'the one-off merge folds parents held twice by siblings linked earlier', async () => {
    const dan = student('Dan', 'MERGEFAM', 'M')
    const eve = student('Eve', 'MERGEFAM', 'F')
    sql(`insert into public.student_contacts (student_id, relationship_id, related_student_id, first_name, surname, gender)
      values ('${dan}', ${rel('sister')}, '${eve}', 'Eve', 'MERGEFAM', 'F')`)
    parent(dan, 'father', { first_name: 'Sam', surname: 'Lee', mobile: '91112222' })
    parent(eve, 'father', { first_name: 'Samuel', surname: 'Lee', telephone: '+852 9111 2222', occupation: 'Pilot' })
    parent(eve, 'mother', { first_name: 'Ann', surname: 'Lee' }) // only on Eve: left alone
    const merged = sql(`select public.merge_sibling_parents()`)
    assert(Number(merged) >= 1, `merged ${merged}`)
    const fathers = sql(`select count(*) || '|' || max(coalesce(occupation, '')) from public.student_contacts c join public.contact_relationships r on r.id = c.relationship_id
      where c.student_id in ('${dan}', '${eve}') and r.code = 'father'`)
    assert(fathers === '1|Pilot', `fathers after merge: ${fathers}`)
    assert(Number(parentsOf(eve)) + Number(parentsOf(dan)) === 2, 'the mother on Eve should be untouched')
  })
} finally {
  reset()
  await browser.close()
}
process.exit(summary() ? 1 : 0)
