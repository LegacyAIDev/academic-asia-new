import { describe, it, expect } from 'vitest'
import { parseSchedulerParams } from '../search-params'

const NOW = new Date('2026-03-16T04:00:00.000Z')
const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'

describe('parseSchedulerParams - ids and modes', () => {
  it('dedupes repeated people ids per kind', () => {
    const p = parseSchedulerParams({ people: `p:${A},p:${A},s:${B},s:${B},p:${B}` }, NOW)
    expect(p.profileIds).toEqual([A, B])
    expect(p.studentIds).toEqual([B])
  })

  it('dedupes repeated room ids and drops invalid ones', () => {
    expect(parseSchedulerParams({ rooms: `${A},${A},bad,${B}` }, NOW).roomIds).toEqual([A, B])
  })

  it('falls back to week for month mode in the rooms view', () => {
    expect(parseSchedulerParams({ view: 'rooms', mode: 'month' }, NOW).mode).toBe('week')
  })

  it('keeps month mode in the team view', () => {
    const p = parseSchedulerParams({ view: 'team', mode: 'month' }, NOW)
    expect(p.view).toBe('team')
    expect(p.mode).toBe('month')
  })
})
