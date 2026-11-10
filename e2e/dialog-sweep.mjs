/**
 * Interaction sweep: on each page, opens every "New / Add / Edit / Book /
 * Upload ..." control, checks it opens without errors, then presses its save
 * button on the untouched form and classifies what happens:
 *   feedback   - a message explains what is missing (good)
 *   native     - the browser's own required-field check stops it (good)
 *   saved      - the untouched form closed as if saved (check: blank record?)
 *   silent     - nothing happened and nothing explains why (bug pattern)
 *   crash      - an error screen or uncaught error (bug)
 * Writes to the local test database only. Set SWEEP_ROLE to pick the account.
 */
import { BASE, launch, SEED, signIn } from './lib/harness.mjs'

const S = SEED.student, H = SEED.headington, A = SEED.application
const PAGES = [
  '/tasks', '/students',
  ...['overview', 'resume', 'family', 'education', 'documents', 'applications', 'communications', 'events', 'immigration'].map(t => `/students/${S}?tab=${t}`),
  `/students/${S}/applications/${A}`,
  '/schools',
  ...['basic', 'entrance-exams', 'fees', 'academic-results', 'contacts', 'events', 'notes', 'documents', 'communications', 'courses', 'bank-details', 'visits'].map(t => `/schools/${H}?tab=${t}`),
  '/events', '/exams', '/exams?view=all', '/scheduler', '/scheduler/rooms', '/students/present-schools',
]
const TRIGGER = /^(new|add|create|edit|book|upload|log|record|schedule|file email|attach|blocked times|reschedule)\b/i
const SAVE = /^(save|create|add|submit|upload|book|file email|confirm|record|schedule|update)\b/i
const ERROR_SCREENS = ['This page couldn’t load', "This page couldn't load", 'Application error']
const pause = ms => new Promise(r => setTimeout(r, ms))

/** Visible, enabled triggers on the page itself (not inside an open dialog), by label. */
const triggersOn = page => page.evaluate(re => {
  const rx = new RegExp(re, 'i')
  const label = el => (el.getAttribute('aria-label') || el.innerText || '').replace(/\s+/g, ' ').trim()
  const seen = new Set()
  return [...document.querySelectorAll('main button, main a[role="button"]')]
    .filter(el => el.offsetParent !== null && !el.disabled && !el.closest('[role="dialog"]') && rx.test(label(el)))
    .map(label).filter(l => l.length < 60 && !seen.has(l) && seen.add(l))
}, TRIGGER.source)

async function clickByLabel(page, text, scope) {
  return page.evaluate((t, s) => {
    const label = el => (el.getAttribute('aria-label') || el.innerText || '').replace(/\s+/g, ' ').trim()
    const el = [...document.querySelectorAll(`${s} button, ${s} a[role="button"]`)]
      .find(e => e.offsetParent !== null && !e.disabled && label(e) === t && (s !== 'main' || !e.closest('[role="dialog"]')))
    if (!el) return false
    el.click()
    return true
  }, text, scope)
}

const dialogOpen = page => page.evaluate(() => Boolean(document.querySelector('[role="dialog"], [role="alertdialog"]')))

async function tryTrigger(page, route, label) {
  const errors = []
  const onError = e => errors.push(e.message.slice(0, 120))
  page.on('pageerror', onError)
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle2', timeout: 120000 })
    const before = page.url()
    if (!(await clickByLabel(page, label, 'main'))) return { outcome: 'skip', note: 'trigger gone after reload' }
    await pause(900)
    const screen = await page.evaluate(s => s.find(x => document.body.innerText.includes(x)) ?? null, ERROR_SCREENS)
    if (screen || errors.length) return { outcome: 'crash', note: screen ?? errors[0] }
    if (!(await dialogOpen(page))) {
      return { outcome: 'opened', note: page.url() !== before ? `navigated to ${new URL(page.url()).pathname}` : 'no dialog (menu or inline)' }
    }
    // Press the dialog's save button on the untouched form.
    const save = await page.evaluate(re => {
      const rx = new RegExp(re, 'i')
      const dlg = [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].pop()
      const buttons = [...dlg.querySelectorAll('button')].filter(b => b.offsetParent !== null && b.innerText.trim()).reverse()
      const btn = buttons.find(b => b.type === 'submit' && b.innerText.trim() !== 'Cancel') ?? buttons.find(b => rx.test(b.innerText.trim()))
      if (!btn) return null
      if (btn.disabled) return `disabled:${btn.innerText.trim()}`
      btn.click()
      return btn.innerText.trim()
    }, SAVE.source)
    if (!save) return { outcome: 'opened', note: 'dialog has no save button' }
    if (save.startsWith('disabled:')) return { outcome: 'feedback', note: `Save disabled until filled (${save.slice(9)})` }
    await pause(1800)
    const after = await page.evaluate(() => {
      const dlg = [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].pop()
      const toasts = [...document.querySelectorAll('[data-sonner-toast]')].map(t => t.innerText.replace(/\s+/g, ' ').trim())
      if (!dlg) return { open: false, toasts }
      const invalid = dlg.querySelectorAll(':invalid').length
      const messages = [...dlg.querySelectorAll('[role="alert"], .text-destructive, [data-slot="form-message"], [aria-invalid="true"]')]
        .map(e => e.innerText?.replace(/\s+/g, ' ').trim()).filter(Boolean)
      return { open: true, invalid, messages, toasts }
    })
    if (errors.length) return { outcome: 'crash', note: errors[0] }
    if (!after.open) return { outcome: 'saved', note: `closed after "${save}"${after.toasts.length ? `; toast: ${after.toasts.join(' / ')}` : ''}` }
    if (after.messages.length) return { outcome: 'feedback', note: after.messages.slice(0, 2).join(' / ').slice(0, 140) }
    if (after.toasts.length) return { outcome: 'feedback', note: `toast: ${after.toasts.join(' / ').slice(0, 140)}` }
    if (after.invalid) return { outcome: 'native', note: `${after.invalid} required field(s)` }
    return { outcome: 'silent', note: `pressed "${save}", dialog stayed open, no message` }
  } catch (err) {
    return { outcome: 'error', note: err.message.slice(0, 120) }
  } finally {
    page.off('pageerror', onError)
  }
}

const role = process.env.SWEEP_ROLE ?? 'manager'
const browser = await launch()
const tally = {}
try {
  const { page } = await signIn(browser, `${role}@aa.test`)
  page.removeAllListeners('pageerror')
  for (const route of PAGES) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle2', timeout: 120000 })
    const labels = await triggersOn(page)
    if (!labels.length) continue
    console.log(`\n${route}`)
    for (const label of labels.slice(0, 20)) {
      const { outcome, note } = await tryTrigger(page, route, label)
      tally[outcome] = (tally[outcome] ?? 0) + 1
      const mark = { feedback: '✓', native: '✓', opened: '·', skip: '·', saved: '?', silent: '✗', crash: '✗', error: '!' }[outcome]
      console.log(`  ${mark} ${outcome.padEnd(8)} ${label}  —  ${note}`)
    }
  }
} finally {
  await browser.close()
}
console.log('\n', tally)
