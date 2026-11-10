/**
 * End-to-end check of the loading indicators on a slow connection: moving to
 * another page shows the "Loading…" screen, a tab or filter change (which keeps
 * the current view on screen) shows the top loading bar, and both are gone once
 * the new view is on screen.
 */
import { assert, launch, open, SEED, seeText, signIn, step, summary } from './lib/harness.mjs'

const BAR = '[role="progressbar"][aria-label="Loading"]'

const browser = await launch()
try {
  const { page } = await signIn(browser, 'manager@aa.test')
  const cdp = await page.createCDPSession()
  const slow = latency => cdp.send('Network.emulateNetworkConditions', { offline: false, latency, downloadThroughput: -1, uploadThroughput: -1 })

  await step(page, 'going to another page shows the loading screen, then the page', async () => {
    await open(page, '/students')
    await slow(1500)
    const link = await page.waitForFunction(() => [...document.querySelectorAll('nav a, aside a')].find(a => a.getAttribute('href') === '/schools') ?? null, { polling: 100 })
    await link.asElement().click()
    await page.waitForFunction(() => [...document.querySelectorAll('[role="status"]')].some(el => el.innerText.includes('Loading')), { polling: 50, timeout: 5000 })
    await page.waitForFunction(() => location.pathname === '/schools' && ![...document.querySelectorAll('[role="status"]')].some(el => el.innerText.includes('Loading')), { polling: 100, timeout: 60000 })
    assert(!(await page.$(BAR)), 'the bar is still showing')
    await slow(0)
  })

  await step(page, 'switching a tab on a record shows the bar until the tab arrives', async () => {
    await open(page, `/students/${SEED.student}?tab=overview`)
    await slow(1500)
    await page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].find(t => t.innerText.trim() === 'Family').click())
    await page.waitForSelector(BAR, { timeout: 3000 })
    await page.waitForFunction(() => location.search.includes('tab=family'), { polling: 100, timeout: 60000 })
    await page.waitForFunction(sel => !document.querySelector(sel), { polling: 100, timeout: 60000 }, BAR)
    await slow(0)
  })

  await step(page, 'a list filter shows the bar while the filtered results load', async () => {
    await open(page, '/exams?view=all')
    await slow(1500)
    await page.evaluate(() => [...document.querySelectorAll('main a, main button')].find(b => b.innerText.trim() === 'Exam desk')?.click())
    await page.waitForSelector(BAR, { timeout: 3000 })
    await page.waitForFunction(sel => !document.querySelector(sel), { polling: 100, timeout: 60000 }, BAR)
    await slow(0)
  })

  await step(page, 'clicking a link to the page already open does not leave the bar running', async () => {
    await open(page, '/schools')
    await page.evaluate(() => [...document.querySelectorAll('nav a, aside a')].find(a => a.getAttribute('href') === '/schools')?.click())
    await new Promise(r => setTimeout(r, 500))
    assert(!(await page.$(BAR)), 'bar shown for the current page')
    await seeText(page, 'Schools')
  })
} finally {
  await browser.close()
}
process.exit(summary() ? 1 : 0)
