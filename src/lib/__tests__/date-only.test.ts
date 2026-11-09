import { describe, expect, it } from 'vitest'
import { parseDateOnly, toDateOnly } from '../date-only'

describe('toDateOnly', () => {
  it('keeps the calendar day a date picker selected', () => {
    expect(toDateOnly(new Date(2012, 0, 15))).toBe('2012-01-15')
    expect(toDateOnly(new Date(2026, 9, 24))).toBe('2026-10-24')
  })

  it('pads single-digit days and months', () => {
    expect(toDateOnly(new Date(2027, 2, 5))).toBe('2027-03-05')
  })

  it('ignores the time of day, including just after midnight', () => {
    expect(toDateOnly(new Date(2026, 9, 24, 0, 5))).toBe('2026-10-24')
    expect(toDateOnly(new Date(2026, 9, 24, 23, 59))).toBe('2026-10-24')
  })
})

describe('parseDateOnly', () => {
  it('reads a stored date as that calendar day', () => {
    const d = parseDateOnly('2012-01-15')!
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2012, 0, 15])
  })

  it('returns undefined for blank or malformed values', () => {
    expect(parseDateOnly(null)).toBeUndefined()
    expect(parseDateOnly('')).toBeUndefined()
    expect(parseDateOnly('15/01/2012')).toBeUndefined()
    expect(parseDateOnly('2026-02-30')).toBeUndefined()
  })

  it('round-trips without drifting over repeated saves (DEV24-001)', () => {
    let stored = '2012-01-15'
    for (let save = 0; save < 5; save++) stored = toDateOnly(parseDateOnly(stored)!)
    expect(stored).toBe('2012-01-15')
  })
})
