/**
 * End-to-end check of Jack's 13 Nov feedback on schools: an entrance exam
 * record opens in a drawer to view and edit (read-only without the Schools
 * edit right), and the Courses tab shows one entry year at a time with the
 * matching entrance exam format beside the chosen course.
 * Needs psql on PATH and E2E_DB_URL for the local test database.
 */
import { execFileSync } from 'node:child_process'
import { assert, choose, click, launch, notSeeText, open, SEED, seeText, signIn, step, summary } from './lib/harness.mjs'

const DB = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = query => execFileSync('psql', [DB, '-X', '-A', '-t', '-q', '-c', query], { encoding: 'utf8' }).trim()
const SCHOOL = SEED.brighton
const DIALOG = '[role="dialog"]'
const PANEL = 'section[aria-label="Entrance exam format"]'
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))

function reset() {
  sql(`delete from public.school_courses where school_id = '${SCHOOL}' and remarks = 'UAT feedback'`)
  sql(`delete from public.school_entrance_exams where school_id = '${SCHOOL}' and remarks = 'UAT feedback'`)
}
reset()
const examType = sql(`select id from public.entrance_exam_types order by id limit 1`)
const course = (label, year) => `((select id from public.courses where label = '${label}'), '${year}')`
sql(`insert into public.school_courses (school_id, course_id, school_year, remarks)
  select '${SCHOOL}', c.course_id, c.year, 'UAT feedback' from (values ${course('Year 9', '2032-33')}, ${course('Year 10', '2032-33')}, ${course('Year 7', '2033-34')}) as c(course_id, year)`)
sql(`insert into public.school_entrance_exams (school_id, entry_year, year_level, subject, duration_minutes, exam_format, exam_type_id, remarks) values
  ('${SCHOOL}', '2032-33', 'Year 9', 'Mathematics', 60, 'Written paper. Calculator allowed', ${examType}, 'UAT feedback'),
  ('${SCHOOL}', '2032-33', 'Year 9', 'English', 45, 'Reading and writing', ${examType}, 'UAT feedback'),
  ('${SCHOOL}', '2033-34', 'Year 9', 'Reasoning', 30, null, ${examType}, 'UAT feedback')`)

const browser = await launch()
try {
  const { page } = await signIn(browser, 'manager@aa.test')

  await step(page, 'Courses show one entry year at a time', async () => {
    await open(page, `/schools/${SCHOOL}?tab=courses`)
    await seeText(page, '2032–33', 'button[aria-label="Entry year"]')
    await seeText(page, 'Year 9', 'main table')
    await seeText(page, 'Year 10', 'main table')
    await notSeeText(page, 'Year 7', 'main table')
    await seeText(page, 'Choose a course to see the entrance exams', 'main')
  })

  await step(page, 'clicking a course highlights it and shows its entrance exam format', async () => {
    await click(page, 'Year 9', 'main table')
    await page.waitForSelector('tr[aria-selected="true"]')
    await seeText(page, '2032–33 entry · Secondary', PANEL)
    await seeText(page, 'Mathematics', PANEL)
    await seeText(page, '60 min', PANEL)
    await seeText(page, 'Calculator allowed', PANEL)
    await seeText(page, 'English', PANEL)
    await notSeeText(page, 'Reasoning', PANEL) // a different entry year
    await seeText(page, 'From Entrance exams · 2032–33 entry', PANEL)
    const count = await page.$eval('tr[aria-selected="true"]', row => row.innerText)
    assert(count.includes('2 recorded'), `row says: ${count}`)
  })

  await step(page, 'a course with no matching exams says so', async () => {
    await click(page, 'Year 10', 'main table')
    await seeText(page, 'No entrance exam details recorded for this entry year and year group.', PANEL)
  })

  await step(page, 'another entry year lists its own courses', async () => {
    await choose(page, 'button[aria-label="Entry year"]', '2033–34')
    await seeText(page, 'Year 7', 'main table')
    await notSeeText(page, 'Year 10', 'main table')
  })

  await step(page, 'an entrance exam opens from its row, and changes save', async () => {
    await open(page, `/schools/${SCHOOL}?tab=entrance-exams`)
    await page.click('button[aria-label^="Open entrance exam: Mathematics, Year 9, 2032-33"]')
    await seeText(page, 'Mathematics · Year 9 · 2032-33 entry', DIALOG)
    await pause(500)
    await page.$eval(`${DIALOG} input[name="duration_minutes"]`, el => el.select())
    await page.type(`${DIALOG} input[name="duration_minutes"]`, '75')
    await click(page, 'Save changes', DIALOG)
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { polling: 100, timeout: 30000 })
    assert(sql(`select duration_minutes from public.school_entrance_exams where school_id = '${SCHOOL}' and subject = 'Mathematics' and remarks = 'UAT feedback'`) === '75', 'duration not saved')
    await seeText(page, '75 min', 'main table')
  })

  const staff = (await signIn(browser, 'staff@aa.test')).page
  await step(staff, 'without the Schools edit right the record opens read-only', async () => {
    await open(staff, `/schools/${SCHOOL}?tab=entrance-exams`)
    await staff.click('button[aria-label^="Open entrance exam: English, Year 9, 2032-33"]')
    await seeText(staff, 'The details of this entrance exam.', DIALOG)
    const save = await staff.evaluate(() => [...document.querySelectorAll('[role="dialog"] button')].some(b => b.innerText.trim() === 'Save changes'))
    assert(!save, 'a Save button is offered to a read-only user')
    const disabled = await staff.$eval(`${DIALOG} input[name="subject"]`, el => el.matches(":disabled"))
    assert(disabled, 'fields are editable for a read-only user')
  })
} finally {
  reset()
  await browser.close()
}
process.exit(summary() ? 1 : 0)
