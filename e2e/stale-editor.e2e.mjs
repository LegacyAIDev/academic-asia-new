/**
 * End-to-end check of UAT DEV24-002: a student editor opened before someone
 * else saved cannot silently put the older details back. The late save is
 * refused with reload guidance, and works after reloading.
 * Needs psql on PATH and E2E_DB_URL for the local test database.
 */
import { execFileSync } from 'node:child_process'
import { assert, click, launch, open, seeText, signIn, step, summary } from './lib/harness.mjs'

const DB = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = query => execFileSync('psql', [DB, '-X', '-A', '-t', '-q', '-c', query], { encoding: 'utf8' }).trim()

sql(`delete from public.students where surname = 'STALETEST'`)
const id = sql(`insert into public.students (surname, first_name, student_code) values ('STALETEST', 'Leo', 'S0STALE') returning id`).split('\n')[0]
const row = () => sql(`select first_name || '|' || coalesce(remarks, '') from public.students where id = '${id}'`)

async function replace(page, selector, value) {
  await page.$eval(selector, el => el.select())
  await page.keyboard.press('Backspace')
  await page.type(selector, value)
}

const browser = await launch()
try {
  const { context, page: editorA } = await signIn(browser, 'manager@aa.test')
  const editorB = await context.newPage()
  editorB.setDefaultTimeout(20000)

  await step(editorA, 'two editors open the same student', async () => {
    await open(editorA, `/students/${id}/edit`)
    await open(editorB, `/students/${id}/edit`)
    assert(await editorB.$eval('#first_name', el => el.value) === 'Leo', 'editor B should show Leo')
  })

  await step(editorA, 'editor A renames the student and saves', async () => {
    await editorA.bringToFront()
    await replace(editorA, '#first_name', 'Leo Updated24')
    await Promise.all([
      editorA.waitForFunction(sid => location.pathname === `/students/${sid}`, { polling: 100, timeout: 60000 }, id),
      click(editorA, 'Save Changes'),
    ])
    assert(row() === 'Leo Updated24|', `after A: ${row()}`)
  })

  await step(editorB, 'the older editor B is refused, with reload guidance, and the new name survives', async () => {
    await editorB.bringToFront()
    await editorB.type('#remarks', 'Prefers morning calls')
    await click(editorB, 'Save Changes')
    await seeText(editorB, 'your changes were not saved', '[role="alert"]')
    await seeText(editorB, 'Reload latest details', '[role="alert"]')
    assert(editorB.url().endsWith(`/students/${id}/edit`), 'editor B should stay on the form')
    assert(row() === 'Leo Updated24|', `after the refused save: ${row()}`)
  })

  await step(editorB, 'after reloading, editor B shows the new name and can save', async () => {
    await Promise.all([editorB.waitForNavigation({ waitUntil: 'networkidle2' }), click(editorB, 'Reload latest details')])
    assert(await editorB.$eval('#first_name', el => el.value) === 'Leo Updated24', 'the reloaded form should show the new name')
    await editorB.type('#remarks', 'Prefers morning calls')
    await Promise.all([
      editorB.waitForFunction(sid => location.pathname === `/students/${sid}`, { polling: 100, timeout: 60000 }, id),
      click(editorB, 'Save Changes'),
    ])
    assert(row() === 'Leo Updated24|Prefers morning calls', `after B: ${row()}`)
  })

  await step(editorA, 'one editor saving twice in a row is not treated as a conflict', async () => {
    await editorA.bringToFront()
    for (const remarks of ['First edit', 'Second edit']) {
      await open(editorA, `/students/${id}/edit`)
      await replace(editorA, '#remarks', remarks)
      await Promise.all([
        editorA.waitForFunction(sid => location.pathname === `/students/${sid}`, { polling: 100, timeout: 60000 }, id),
        click(editorA, 'Save Changes'),
      ])
    }
    assert(row() === 'Leo Updated24|Second edit', `after two saves: ${row()}`)
  })
} finally {
  await browser.close()
}
process.exit(summary() ? 1 : 0)
