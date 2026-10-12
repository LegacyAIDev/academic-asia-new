import { describe, it, expect } from 'vitest'
import { coverSlipHtml, needsCompactLayout } from '../cover-slip-html'
import { buildCoverSlips } from '../cover-slip-shaping'
import { makeBookingDetail } from '@/lib/scheduler/__tests__/booking-detail-fixture'

/**
 * Each slip goes onto one seat, so it must print on one sheet. The cases here
 * mirror slips that were rendered to PDF and counted while the layout was made.
 */
describe('cover slip - staying on one sheet', () => {
  const papers = (count: number, subject = 'Paper') => Array.from({ length: count }, (_, index) => ({
    id: `${String(index).padStart(8, '0')}-1111-4111-8111-111111111111`, subject: `${subject} ${index + 1}`, duration_minutes: 30,
  }))
  const slipWith = (overrides: Parameters<typeof makeBookingDetail>[0]) => buildCoverSlips(makeBookingDetail(overrides))[0]

  it('prints an ordinary slip at the normal type size', () => {
    const slip = slipWith({ assessment_snapshot: { label: 'Entrance test', papers: papers(3) } })
    expect(needsCompactLayout(slip)).toBe(false)
    expect(coverSlipHtml([slip])).toContain('<section class="slip">')
  })

  it('sets a slip with many papers smaller', () => {
    const slip = slipWith({ assessment_snapshot: { label: 'Entrance test', papers: papers(20) } })
    expect(needsCompactLayout(slip)).toBe(true)
    const html = coverSlipHtml([slip])
    expect(html).toContain('<section class="slip compact">')
    expect(html.match(/<li>/g)).toHaveLength(20)
  })

  it('sets a slip smaller when a few papers come with a very long name, school and assessment', () => {
    // This combination printed on two sheets at the normal size when it was tried.
    const slip = slipWith({
      student: { id: 's', first_name: 'Maximilian Alexander', surname: 'Montgomery-Fitzgerald-Cholmondeley', student_code: 'S1' },
      school: { id: 'x', name: 'The Royal Masonic School for Girls and the Associated Preparatory Department of Rickmansworth Park' },
      assessment_snapshot: { label: 'A'.repeat(200), papers: papers(6, 'English as an Additional Language and Literature, paper') },
    })
    expect(needsCompactLayout(slip)).toBe(true)
  })

  it('counts Chinese characters as twice as wide, so Chinese paper titles reach the smaller setting sooner', () => {
    const latin = slipWith({ assessment_snapshot: { label: 'Entrance test', papers: papers(8, 'English reading and writing') } })
    const chinese = slipWith({ assessment_snapshot: { label: 'Entrance test', papers: papers(8, '英國語文閱讀理解及寫作卷英國語文閱讀理解') } })
    expect(needsCompactLayout(latin)).toBe(false)
    expect(needsCompactLayout(chinese)).toBe(true)
  })

  it('decides for each slip on its own, so one long name does not shrink the others', () => {
    const short = slipWith({})
    const long = slipWith({ assessment_snapshot: { label: 'Entrance test', papers: papers(20) } })
    const html = coverSlipHtml([short, long])
    expect(html).toContain('<section class="slip">')
    expect(html).toContain('<section class="slip compact">')
  })

  it('lets long text wrap instead of pushing the page wide, and keeps a duration on one line', () => {
    const css = coverSlipHtml([slipWith({})])
    expect(css).toContain('overflow-wrap: anywhere')
    expect(css).toContain('.who { min-width: 0; }')
    expect(css).toContain('white-space: nowrap')
  })
})
