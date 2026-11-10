/**
 * Small browser test harness (puppeteer-core + the installed Chrome).
 *
 * Runs against a local app wired to a throwaway local Supabase stack, never the
 * live project. Configure with:
 *   E2E_BASE_URL   app URL (default http://localhost:3100)
 *   E2E_PASSWORD   password of the seeded test accounts
 *   E2E_SEED       JSON with the seeded record ids
 *   E2E_SHOTS      folder for screenshots (default /tmp/aa-e2e-shots)
 *   E2E_CHROME     Chrome executable (default: macOS Google Chrome)
 */
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

export const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3100'
export const SEED = JSON.parse(process.env.E2E_SEED ?? '{}')
const PASSWORD = process.env.E2E_PASSWORD
const SHOTS = process.env.E2E_SHOTS ?? '/tmp/aa-e2e-shots'
const CHROME = process.env.E2E_CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

fs.mkdirSync(SHOTS, { recursive: true })

const results = []

export async function launch() {
  if (!PASSWORD) throw new Error('Set E2E_PASSWORD')
  return puppeteer.launch({ executablePath: CHROME, headless: true, timeout: 90000, protocolTimeout: 60000, defaultViewport: { width: 1440, height: 1000 } })
}

/** A fresh, signed-in browser context per account, so sessions never leak between roles. */
export async function signIn(browser, email) {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  page.setDefaultTimeout(20000)
  page.on('pageerror', err => console.log(`  [page error] ${err.message}`))
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 120000 })
  await page.type('#email', email)
  await page.type('#password', PASSWORD)
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 120000 }), page.click('button[type="submit"]')])
  if (page.url().includes('/login')) throw new Error(`Sign-in failed for ${email}`)
  return { context, page }
}

export async function open(page, route) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle2', timeout: 120000 })
}

/** Records one named check; on failure saves a screenshot and carries on with the next. */
export async function step(page, name, fn) {
  const started = Date.now()
  try {
    await fn()
    results.push({ name, ok: true })
    console.log(`  PASS ${name} (${Date.now() - started} ms)`)
  } catch (err) {
    const file = path.join(SHOTS, `${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`)
    await page.screenshot({ path: file, fullPage: true }).catch(() => {})
    results.push({ name, ok: false, error: err.message, file })
    console.log(`  FAIL ${name}: ${err.message}\n       screenshot: ${file}`)
  }
}

export async function shot(page, name) {
  const file = path.join(SHOTS, `${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
  return file
}

/** Waits for visible text anywhere in the page (or inside a scope selector). */
export async function seeText(page, text, scope = 'body') {
  await page.waitForFunction(
    (s, t) => [...document.querySelectorAll(s)].some(el => el.innerText.replace(/\s+/g, ' ').includes(t)),
    { polling: 100 }, scope, text,
  )
}

export async function notSeeText(page, text, scope = 'body') {
  const present = await page.evaluate(
    (s, t) => [...document.querySelectorAll(s)].some(el => el.innerText.replace(/\s+/g, ' ').includes(t)), scope, text,
  )
  if (present) throw new Error(`Did not expect to see "${text}"`)
}

/** Clicks the first visible button or link whose text matches (exactly, or by prefix), optionally inside a scope. */
export async function click(page, text, scope = 'body', { prefix = false } = {}) {
  const handle = await page.waitForFunction((s, t, p) => {
    const nodes = [...document.querySelectorAll(`${s} button, ${s} a, ${s} [role="tab"], ${s} [role="option"], ${s} [role="menuitem"]`)]
    const text = el => el.innerText.replace(/\s+/g, ' ').trim()
    const matches = el => (p ? text(el).startsWith(t) : text(el) === t)
    return nodes.find(el => matches(el) && el.offsetParent !== null && !el.disabled) ?? null
  }, { polling: 100 }, scope, text, prefix)
  await handle.asElement().click()
}

/** Picks an option in a Radix Select and waits for its list to close, so the next click is not swallowed. */
export async function choose(page, triggerSelector, optionText) {
  await page.click(triggerSelector)
  await click(page, optionText)
  await page.waitForFunction(() => !document.querySelector('[role="listbox"]'))
  await new Promise(resolve => setTimeout(resolve, 300))
}

export function assert(condition, message) {
  if (!condition) throw new Error(message)
}

export function summary() {
  const failed = results.filter(r => !r.ok)
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`)
  for (const f of failed) console.log(`  - ${f.name}: ${f.error}`)
  return failed.length
}

/** Sets a React-controlled input (e.g. type="date") by value, firing the events React listens for. */
export async function setValue(page, selector, value) {
  await page.$eval(selector, (el, v) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, v)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }, value)
}

/** "YYYY-MM-DD" for today plus some days, on the Hong Kong calendar. */
export function hkDay(offsetDays = 0) {
  return new Date(Date.now() + 8 * 3600000 + offsetDays * 86400000).toISOString().slice(0, 10)
}
