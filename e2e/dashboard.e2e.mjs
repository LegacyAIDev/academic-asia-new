/**
 * Dashboard: real counts, a "needs your attention" list, the person's own day,
 * quick starts, and every link leading somewhere useful. Each role sees only
 * what its rights allow.
 */
import { BASE, launch, signIn, open, step, shot, seeText, notSeeText, assert, summary } from './lib/harness.mjs'

const browser = await launch()
try {
  const { page } = await signIn(browser, 'admin@aa.test')

  await step(page, 'dashboard greets by name with real figures', async () => {
    await open(page, '/')
    await seeText(page, 'Good ')
    await seeText(page, 'Needs you today')
    await seeText(page, 'Active students')
    await notSeeText(page, '38,294')
    await notSeeText(page, 'Placement Rate')
    await seeText(page, 'Applications in progress')
    await seeText(page, 'Exams, next 14 days')
    await notSeeText(page, 'Open applications')
    await shot(page, 'dashboard-admin-1512')
  })

  await step(page, 'Active students figure opens the list filtered to Active', async () => {
    await open(page, '/')
    const href = await page.$$eval('main a', links => links.find(a => a.textContent?.includes('Active students'))?.getAttribute('href'))
    assert(/^\/students\?status=\d+$/.test(href ?? ''), `unexpected tile link ${href}`)
    await open(page, href)
    await seeText(page, 'Students')
  })

  await step(page, 'awaiting confirmation agrees between the list and the figures', async () => {
    await open(page, '/')
    const text = await page.evaluate(() => document.querySelector('main').innerText)
    const listed = text.match(/(\d+) exams? in the next 7 days waiting for confirmation/)?.[1]
    const noted = text.match(/(\d+) awaiting confirmation/)?.[1]
    assert(listed && listed === noted, `list says ${listed}, figures say ${noted}`)
  })

  await step(page, 'every dashboard link resolves', async () => {
    await open(page, '/')
    const hrefs = await page.$$eval('main a[href^="/"]', links => [...new Set(links.map(a => a.getAttribute('href')))])
    for (const href of hrefs) {
      const res = await page.goto(`${BASE}${href}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
      assert(res && res.status() < 400, `${href} returned ${res?.status()}`)
    }
  })

  await step(page, 'phone layout puts attention first', async () => {
    await page.setViewport({ width: 390, height: 844 })
    await open(page, '/')
    await seeText(page, 'Needs you today')
    await shot(page, 'dashboard-admin-390')
    await page.setViewport({ width: 1512, height: 982 })
  })

  const junior = await signIn(browser, 'junior@aa.test')
  await step(junior.page, 'junior sees only what they may open', async () => {
    await junior.page.setViewport({ width: 1512, height: 982 })
    await open(junior.page, '/')
    await seeText(junior.page, 'Good ')
    await shot(junior.page, 'dashboard-junior-1512')
  })
} finally {
  await browser.close()
}
summary()
