/**
 * Smoke sweep of every page and tab, as each test role. For each page it
 * records crashes (error screen, uncaught errors), console errors, server
 * errors (5xx) and failed requests, so a broken page shows up even where no
 * suite exercises it. Prints one line per problem and a summary per role.
 * Needs psql on PATH and E2E_DB_URL for the local test database.
 */
import { execFileSync } from 'node:child_process'
import { BASE, launch, SEED, signIn } from './lib/harness.mjs'

const DB = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = query => execFileSync('psql', [DB, '-X', '-A', '-t', '-q', '-c', query], { encoding: 'utf8' }).trim()

const S = SEED.student, H = SEED.headington, A = SEED.application
const booking = sql(`select id from public.scheduler_bookings where status <> 'cancelled' order by created_at limit 1`)
const profile = sql(`select p.id from public.profiles p join auth.users u on u.id = p.id where u.email = 'staff@aa.test'`)

const STUDENT_TABS = ['overview', 'resume', 'family', 'education', 'documents', 'applications', 'communications', 'events', 'immigration', 'calendar']
const SCHOOL_TABS = ['basic', 'entrance-exams', 'fees', 'academic-results', 'contacts', 'events', 'notes', 'documents', 'communications', 'courses', 'bank-details', 'visits']
const EVENT_TYPES = ['expo-fair', 'seminar-webinar', 'briefing-meeting', 'reception-social', 'interview', 'audition-day', 'group-entrance-exam', 'school-assessment-scholarship']

const ROUTES = [
  '/', '/tasks',
  '/students', '/students/new', '/students/present-schools', '/students/brief-intros/export',
  ...STUDENT_TABS.map(t => `/students/${S}?tab=${t}`), `/students/${S}/edit`, `/students/${S}/applications/${A}`,
  '/schools', '/schools/new', '/schools/export',
  ...SCHOOL_TABS.map(t => `/schools/${H}?tab=${t}`), `/schools/${H}/edit`,
  '/events', ...EVENT_TYPES.flatMap(t => [`/events/${t}`, `/events/${t}/new`]),
  '/exams', '/exams?view=all',
  '/scheduler', '/scheduler?view=day', '/scheduler?view=month', '/scheduler?mode=team', '/scheduler?mode=rooms', '/scheduler/rooms',
  ...(booking ? [`/scheduler/bookings/${booking}`] : []),
  '/staff', '/staff/new', ...(profile ? [`/staff/${profile}`, `/staff/${profile}/edit`] : []),
  '/reports', '/settings', '/settings/access-levels',
]

const IGNORED_PREFETCH = (process.env.SWEEP_IGNORE_PREFETCH ?? '/reports').split(',')
const ERROR_SCREENS = ['This page couldn’t load', "This page couldn't load", 'Application error', 'Unhandled Runtime Error', 'Something went wrong']
const NOT_FOUND = ['This page could not be found', '404']

async function visit(page, route) {
  const problems = []
  const onError = err => problems.push(`uncaught: ${err.message.slice(0, 160)}`)
  const onConsole = msg => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    const where = msg.location()?.url ?? ''
    // Background prefetch of a sidebar link; the page itself is checked on its own row.
    if (where.includes('_rsc=') && IGNORED_PREFETCH.some(path => where.includes(`${path}?_rsc=`))) return
    problems.push(`console: ${text.slice(0, 160)}${where && text.startsWith('Failed to load resource') ? ` (${where.replace(BASE, '').slice(0, 100)})` : ''}`)
  }
  const onResponse = res => { if (res.status() >= 500) problems.push(`HTTP ${res.status()} ${res.url().replace(BASE, '').slice(0, 120)}`) }
  const onFailed = req => {
    const why = req.failure()?.errorText ?? ''
    if (!why.includes('ERR_ABORTED')) problems.push(`request failed: ${req.url().replace(BASE, '').slice(0, 120)} ${why}`)
  }
  page.on('pageerror', onError); page.on('console', onConsole); page.on('response', onResponse); page.on('requestfailed', onFailed)
  let finalPath = route
  try {
    const res = await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle2', timeout: 120000 })
    await new Promise(r => setTimeout(r, 400))
    finalPath = new URL(page.url()).pathname + new URL(page.url()).search
    const text = await page.evaluate(() => document.body.innerText)
    const screen = ERROR_SCREENS.find(s => text.includes(s))
    if (screen) problems.push(`error screen: "${screen}"`)
    if (res && res.status() === 404 || NOT_FOUND.every(s => text.includes(s))) problems.push('page not found (404)')
  } catch (err) {
    problems.push(`navigation: ${err.message.slice(0, 120)}`)
  } finally {
    page.off('pageerror', onError); page.off('console', onConsole); page.off('response', onResponse); page.off('requestfailed', onFailed)
  }
  return { route, finalPath, problems }
}

const roles = (process.env.SWEEP_ROLES ?? 'manager,staff,junior').split(',')
const browser = await launch()
let total = 0
try {
  for (const role of roles) {
    const { context, page } = await signIn(browser, `${role}@aa.test`)
    page.removeAllListeners('pageerror')
    let bad = 0
    console.log(`\n== ${role}`)
    for (const route of ROUTES) {
      const { finalPath, problems } = await visit(page, route)
      const redirected = finalPath !== route ? ` -> ${finalPath}` : ''
      if (problems.length) {
        bad++
        console.log(`  ✗ ${route}${redirected}`)
        for (const p of [...new Set(problems)]) console.log(`      ${p}`)
      } else if (redirected) {
        console.log(`  ~ ${route}${redirected}`)
      }
    }
    console.log(`  ${ROUTES.length - bad}/${ROUTES.length} pages clean`)
    total += bad
    await context.close()
  }
} finally {
  await browser.close()
}
process.exit(total ? 1 : 0)
