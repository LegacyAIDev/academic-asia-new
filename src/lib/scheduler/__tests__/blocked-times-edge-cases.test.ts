import { describe, it, expect } from 'vitest'
import {
  BLOCK_PRESETS,
  blockedTimeSchema,
  describeBlockedTime,
  findBlockClashes,
  hasEnded,
  hkDateRangeToInstants,
  isoWeekday,
  presetFor,
} from '../blocked-times'

const base = { label: 'Lunch', start_time: '13:00', end_time: '14:00', starts_on: '2026-11-03' }
const issues = (input: object) => {
  const result = blockedTimeSchema.safeParse(input)
  return result.success ? [] : result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
}

describe('presetFor round trips', () => {
  it('reopens each preset the way the schema stored it', () => {
    for (const preset of ['every_day', 'weekdays'] as const) {
      const stored = blockedTimeSchema.parse({ ...base, preset })
      expect(presetFor(stored.weekdays, stored.starts_on, stored.ends_on)).toBe(preset)
    }
    const pick = blockedTimeSchema.parse({ ...base, preset: 'pick', weekdays: [2, 4] })
    expect(presetFor(pick.weekdays, pick.starts_on, pick.ends_on)).toBe('pick')
    const once = blockedTimeSchema.parse({ ...base, preset: 'once' })
    expect(presetFor(once.weekdays, once.starts_on, once.ends_on)).toBe('once')
  })

  it('does not mistake a repeated day list for a full week', () => {
    expect(presetFor([1, 1, 1, 1, 1], '2026-11-03', null)).toBe('pick')
    expect(BLOCK_PRESETS.weekdays).toHaveLength(5)
  })
})

describe('blockedTimeSchema edge cases', () => {
  it('stores a Sunday one-off as weekday 7', () => {
    expect(blockedTimeSchema.parse({ ...base, preset: 'once', starts_on: '2026-11-08' }).weekdays).toEqual([7])
  })

  it('rejects an end time equal to the start time', () => {
    expect(issues({ ...base, end_time: '13:00', preset: 'weekdays' })).toEqual(['end_time: End time must be after the start time'])
  })

  it('rejects an end date before the start date for repeating blocks only', () => {
    const early = { ...base, ends_on: '2026-11-02' }
    for (const preset of ['every_day', 'weekdays']) expect(issues({ ...early, preset })).toHaveLength(1)
    expect(issues({ ...early, preset: 'pick', weekdays: [1] })).toHaveLength(1)
    expect(issues({ ...early, preset: 'once' })).toEqual([])
  })

  it('accepts an end date equal to the start date', () => {
    expect(blockedTimeSchema.parse({ ...base, ends_on: base.starts_on, preset: 'every_day' }).ends_on).toBe(base.starts_on)
  })

  it('refuses malformed times, dates and weekday numbers', () => {
    expect(issues({ ...base, start_time: '24:00', preset: 'every_day' })[0]).toBe('start_time: Pick a time')
    expect(issues({ ...base, starts_on: '3/11/2026', preset: 'every_day' })[0]).toContain('Pick a date')
    expect(issues({ ...base, preset: 'pick', weekdays: [0] })).not.toEqual([])
    expect(issues({ ...base, preset: 'pick', weekdays: [8] })).not.toEqual([])
    expect(issues({ ...base, label: 'x'.repeat(81), preset: 'every_day' })).toEqual(['label: Keep the name under 80 characters'])
  })

  it('ignores picked days for the fixed presets', () => {
    expect(blockedTimeSchema.parse({ ...base, preset: 'every_day', weekdays: [] }).weekdays).toHaveLength(7)
  })
})

describe('isoWeekday', () => {
  it('maps every day of a week and crosses a year end', () => {
    expect([2, 3, 4, 5, 6, 7, 8].map(d => isoWeekday(`2026-11-0${d}`))).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(isoWeekday('2026-12-31')).toBe(4)
    expect(isoWeekday('2028-02-29')).toBe(2)
  })
})

describe('describeBlockedTime', () => {
  const block = { start_time: '09:00:00', end_time: '10:30:00', starts_on: '2026-11-03', ends_on: null }

  it('names every_day, weekdays and picked days, with and without an end date', () => {
    expect(describeBlockedTime({ ...block, weekdays: [1, 2, 3, 4, 5, 6, 7], ends_on: '2026-12-01' })).toBe('Every day · 09:00–10:30 · 3 Nov 2026 to 1 Dec 2026')
    expect(describeBlockedTime({ ...block, weekdays: [5, 4, 3, 2, 1] })).toBe('Mon–Fri · 09:00–10:30 · from 3 Nov 2026')
    expect(describeBlockedTime({ ...block, weekdays: [6, 7, 2] })).toBe('Tue, Sat, Sun · 09:00–10:30 · from 3 Nov 2026')
  })

  it('describes a Sunday one-off with its weekday name', () => {
    expect(describeBlockedTime({ ...block, starts_on: '2026-11-08', weekdays: [7], ends_on: '2026-11-08' })).toBe('Sun 8 Nov 2026 · 09:00–10:30')
  })
})

describe('findBlockClashes', () => {
  const at = (from: string, to: string) => ({ startAt: `2026-11-03T${from}:00.000Z`, endAt: `2026-11-03T${to}:00.000Z` })
  const block = [at('05:00', '06:00')]

  it('catches partial overlaps on either side and a booking that surrounds the block', () => {
    const early = at('04:30', '05:15')
    const late = at('05:45', '06:30')
    const around = at('04:00', '07:00')
    expect(findBlockClashes(block, [early, late, around])).toEqual([early, late, around])
  })

  it('matches against any of several occurrences and keeps the order of the items', () => {
    const occurrences = [at('05:00', '06:00'), at('09:00', '10:00')]
    const second = at('09:30', '09:45')
    const none = at('07:00', '08:00')
    const first = at('05:10', '05:20')
    expect(findBlockClashes(occurrences, [second, none, first])).toEqual([second, first])
  })

  it('finds nothing without occurrences or items', () => {
    expect(findBlockClashes([], [at('05:00', '06:00')])).toEqual([])
    expect(findBlockClashes(block, [])).toEqual([])
  })
})

describe('hkDateRangeToInstants', () => {
  it('starts at Hong Kong midnight (+08:00) and ends at the next midnight', () => {
    expect(hkDateRangeToInstants('2026-01-01', '2026-01-01')).toEqual({ from: '2025-12-31T16:00:00.000Z', to: '2026-01-01T16:00:00.000Z' })
  })

  it('rolls over a month end for the inclusive last day', () => {
    expect(hkDateRangeToInstants('2026-11-30', '2026-11-30').to).toBe('2026-11-30T16:00:00.000Z')
    expect(hkDateRangeToInstants('2026-10-25', '2026-11-01').to).toBe('2026-11-01T16:00:00.000Z')
  })
})

describe('dates and times that cannot exist', () => {
  it('rejects a day that is not on the calendar', () => {
    expect(issues({ ...base, preset: 'once', starts_on: '2026-02-31' })).toEqual(['starts_on: Pick a date'])
    expect(issues({ ...base, preset: 'weekdays', ends_on: '2026-13-01' })).toEqual(['ends_on: Pick a date'])
    expect(issues({ ...base, preset: 'once', starts_on: '2028-02-29' })).toEqual([])
  })

  it('reports a malformed time once instead of also comparing it', () => {
    expect(issues({ ...base, preset: 'weekdays', start_time: '24:00', end_time: '14:00' })).toEqual(['start_time: Pick a time'])
  })
})

describe('presetFor with hand-made one-day rows', () => {
  it('only calls it "just once" when the weekday matches the date', () => {
    // 2026-11-03 is a Tuesday; a Monday-only row on that date never occurs and must stay a pick.
    expect(presetFor([1], '2026-11-03', '2026-11-03')).toBe('pick')
    expect(presetFor([2], '2026-11-03', '2026-11-03')).toBe('once')
  })
})

describe('hasEnded', () => {
  it('is true only once the last day is behind us', () => {
    expect(hasEnded({ ends_on: null }, '2026-11-03')).toBe(false)
    expect(hasEnded({ ends_on: '2026-11-03' }, '2026-11-03')).toBe(false)
    expect(hasEnded({ ends_on: '2026-11-02' }, '2026-11-03')).toBe(true)
  })
})
