/**
 * Sidebar: narrows to an icon rail and stays that way after a reload, opens a
 * group's pages from the rail, toggles with Ctrl+B, keeps only the current
 * group open, carries the account menu (no desktop top bar), and on phones
 * opens as a drawer that closes after following a link.
 */
import { launch, signIn, open, step, shot, seeText, click, assert, summary } from './lib/harness.mjs'

const sidebarWidth = page => page.$eval('aside', el => el.getBoundingClientRect().width)

const browser = await launch()
try {
  const { page } = await signIn(browser, 'admin@aa.test')
  await page.setViewport({ width: 1512, height: 982 })

  await step(page, 'desktop has no top bar; account menu is in the sidebar', async () => {
    await open(page, '/')
    assert(!(await page.$('header button[aria-label="Open menu"]').then(el => el?.boundingBox())), 'phone bar visible on desktop')
    await page.click('aside [aria-label^="Account:"]')
    await seeText(page, 'Sign out')
    await page.keyboard.press('Escape')
  })

  await step(page, 'only the current group is open', async () => {
    await open(page, '/')
    const expanded = await page.$$eval('aside button[aria-expanded="true"]', b => b.map(x => x.innerText.trim()))
    assert(expanded.length === 0, `open on dashboard: ${expanded}`)
    await open(page, '/events')
    await seeText(page, 'Interview Day', 'aside')
  })

  await step(page, 'collapse to a rail and stay collapsed after reload', async () => {
    await open(page, '/')
    await page.click('aside button[aria-label="Collapse sidebar"]')
    await page.waitForFunction(() => document.querySelector('aside').getBoundingClientRect().width < 100)
    await page.reload({ waitUntil: 'networkidle2' })
    assert((await sidebarWidth(page)) < 100, 'sidebar wide again after reload')
    await shot(page, 'sidebar-collapsed-1512')
  })

  await step(page, 'rail opens a group menu and follows a link', async () => {
    await page.click('aside [aria-label="Events"]')
    await click(page, 'Interview Day')
    await page.waitForFunction(() => location.pathname === '/events/interview')
  })

  await step(page, 'Ctrl+B widens it again', async () => {
    await page.keyboard.down('Control'); await page.keyboard.press('b'); await page.keyboard.up('Control')
    await page.waitForFunction(() => document.querySelector('aside').getBoundingClientRect().width > 200)
    await page.reload({ waitUntil: 'networkidle2' })
    assert((await sidebarWidth(page)) > 200, 'did not stay open')
  })

  await step(page, 'phone menu opens a drawer that closes on navigation', async () => {
    await page.setViewport({ width: 390, height: 844 })
    await open(page, '/')
    await page.click('header button[aria-label="Open menu"]')
    await page.waitForSelector('[role="dialog"] nav')
    await shot(page, 'sidebar-drawer-390')
    await click(page, 'Schools', '[role="dialog"]')
    await page.waitForFunction(() => location.pathname === '/schools' && !document.querySelector('[role="dialog"]'))
  })
} finally {
  await browser.close()
}
process.exitCode = summary()
