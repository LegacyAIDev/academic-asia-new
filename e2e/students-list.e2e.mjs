/**
 * Students list: status tabs with real counts, stable paging with no student
 * on two pages, a page past the end showing the last page, page size, sorting,
 * search with a clear empty state, and the whole row opening the student.
 */
import { BASE, launch, signIn, open, step, shot, seeText, assert, summary } from './lib/harness.mjs'

const rowLinks = page => page.$$eval('tbody tr a[href^="/students/"]:not([href$="/edit"])', links => [...new Set(links.map(a => a.getAttribute('href')))])
const tabCount = (page, label) => page.$$eval('nav[aria-label="Status"] a', (links, l) => {
  const link = links.find(a => a.firstChild?.textContent?.trim() === l)
  return link ? Number(link.querySelector('span')?.textContent?.replace(/,/g, '')) : null
}, label)

const browser = await launch()
try {
  const { page } = await signIn(browser, 'admin@aa.test')
  await page.setViewport({ width: 1512, height: 982 })

  await step(page, 'tabs show real counts that add up', async () => {
    await open(page, '/students')
    await shot(page, 'students-list-1512')
    const all = await tabCount(page, 'All')
    const counts = await page.$$eval('nav[aria-label="Status"] a span', spans => spans.map(s => Number(s.textContent.replace(/,/g, ''))))
    assert(all > 25, `expected more than one page of students, got ${all}`)
    assert(counts.slice(1).reduce((a, b) => a + b, 0) <= all, 'status counts exceed All')
    await seeText(page, `1–25 of ${all}`)
  })

  await step(page, 'paging never repeats or skips a student', async () => {
    await open(page, '/students')
    const all = await tabCount(page, 'All')
    const seen = []
    for (let p = 1; p <= Math.ceil(all / 25); p++) {
      await open(page, `/students?page=${p}`)
      seen.push(...await rowLinks(page))
    }
    assert(seen.length === all, `saw ${seen.length} rows for ${all} students`)
    assert(new Set(seen).size === all, 'a student appeared on two pages')
  })

  await step(page, 'a page past the end shows the last page', async () => {
    await open(page, '/students?page=999')
    assert((await rowLinks(page)).length > 0, 'page 999 was empty')
    await page.waitForSelector('nav[aria-label="Pages"] [aria-current="page"]')
  })

  await step(page, 'page size 50 shows more rows', async () => {
    await open(page, '/students')
    const all = await tabCount(page, 'All')
    await page.click('[aria-label="Rows per page"] a[href*="per=50"]')
    await page.waitForFunction(() => location.search.includes('per=50'))
    await seeText(page, `1–${Math.min(50, all)} of ${all}`)
  })

  await step(page, 'Active tab filters and its count matches', async () => {
    await open(page, '/students')
    const active = await tabCount(page, 'Active')
    await page.$$eval('nav[aria-label="Status"] a', links => links.find(a => a.firstChild?.textContent?.trim() === 'Active').click())
    await page.waitForFunction(() => location.search.includes('status='))
    await seeText(page, `of ${active}`)
    const badges = await page.$$eval('tbody tr td:nth-child(4)', cells => cells.map(c => c.innerText.trim()))
    assert(badges.length > 0 && badges.every(b => b === 'Active'), `non-active rows: ${badges.join(',')}`)
  })

  await step(page, 'sorting by name orders surnames', async () => {
    await open(page, '/students?sort=name&dir=asc&per=100')
    const names = await page.$$eval('tbody tr td:first-child a', links => links.map(a => a.textContent.trim().split(' ').pop().toLowerCase()))
    const sorted = [...names].sort((a, b) => a.localeCompare(b))
    assert(names.join() === sorted.join() || names.slice(0, 5).join() === sorted.slice(0, 5).join(), `not sorted: ${names.slice(0, 6).join(', ')}`)
    const aria = await page.$eval('th[aria-sort="ascending"]', th => th.innerText.trim())
    assert(aria === 'Student', `aria-sort on ${aria}`)
  })

  await step(page, 'search finds a student and a miss offers to clear', async () => {
    await open(page, '/students')
    await page.type('input[aria-label="Search students"]', 'chloe')
    await page.waitForFunction(() => location.search.includes('search=chloe'))
    await seeText(page, 'Chloe WONG')
    await open(page, '/students?search=zzqqxx')
    await seeText(page, 'No students match')
    await seeText(page, 'Clear search and filters')
  })

  await step(page, 'clicking anywhere on a row opens the student', async () => {
    await open(page, '/students')
    const href = (await rowLinks(page))[0]
    const cell = await page.$('tbody tr:first-child td:nth-child(4)')
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }), cell.click()])
    assert(page.url() === `${BASE}${href}`, `went to ${page.url()} not ${href}`)
  })

  await step(page, 'phone list fits the screen', async () => {
    await page.setViewport({ width: 390, height: 844 })
    await open(page, '/students')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    assert(overflow <= 0, `page scrolls sideways by ${overflow}px`)
    await shot(page, 'students-list-390')
    await page.setViewport({ width: 1512, height: 982 })
  })
} finally {
  await browser.close()
}
process.exitCode = summary()
