import { describe, it, expect } from 'vitest'
import {
  blockedTimeSchema,
  describeBlockedTime,
  findBlockClashes,
  hkDateRangeToInstants,
  isoWeekday,
  presetFor,
  toBlockedTimeInput,
  type BlockedTime,
} from '../blocked-times'

const base = { label: 'Lunch', start_time: '13:00', end_time: '14:00', starts_on: '2026-11-03' }

describe('presetFor', () => {
  it('recognises every day and Mon–Fri whatever the order', () => {
    expect(presetFor([1, 2, 3, 4, 5, 6, 7], '2026-11-03', null)).toBe('every_day')
    expect(presetFor([5, 4, 3, 2, 1], '2026-11-03', null)).toBe('weekdays')
  })

  it('treats other days as a pick', () => {
    expect(presetFor([1, 3], '2026-11-03', null)).toBe('pick')
    expect(presetFor([1, 2, 3, 4, 5, 6], '2026-11-03', null)).toBe('pick')
  })

  it('recognises a one-off: one weekday, ending the day it starts', () => {
    expect(presetFor([2], '2026-11-03', '2026-11-03')).toBe('once')
    expect(presetFor([2], '2026-11-03', null)).toBe('pick')
    expect(presetFor([2], '2026-11-03', '2026-11-10')).toBe('pick')
  })
})

describe('blockedTimeSchema', () => {
  it('expands presets to weekdays', () => {
    expect(blockedTimeSchema.parse({ ...base, preset: 'every_day' }).weekdays).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(blockedTimeSchema.parse({ ...base, preset: 'weekdays', weekdays: [7] }).weekdays).toEqual([1, 2, 3, 4, 5])
  })

  it('sorts and dedupes picked days', () => {
    expect(blockedTimeSchema.parse({ ...base, preset: 'pick', weekdays: [5, 1, 5] }).weekdays).toEqual([1, 5])
  })

  it('turns "once" into the weekday of the start date and ends the same day', () => {
    const parsed = blockedTimeSchema.parse({ ...base, preset: 'once', weekdays: [1, 2], ends_on: '2026-12-31' })
    expect(parsed.weekdays).toEqual([2])
    expect(parsed.ends_on).toBe('2026-11-03')
  })

  it('round-trips through the form values of a stored block', () => {
    const stored: BlockedTime = {
      id: 'b', label: 'Lunch', profile_id: 'p', room_id: null, weekdays: [1, 2, 3, 4, 5],
      start_time: '13:00:00', end_time: '14:00:00', starts_on: '2026-11-03', ends_on: null,
    }
    const parsed = blockedTimeSchema.parse(toBlockedTimeInput(stored))
    expect(parsed).toEqual({
      label: 'Lunch', weekdays: [1, 2, 3, 4, 5], start_time: '13:00', end_time: '14:00', starts_on: '2026-11-03', ends_on: null,
    })
  })

  it('trims the label and reports plain messages', () => {
    expect(blockedTimeSchema.parse({ ...base, label: '  Lunch ', preset: 'every_day' }).label).toBe('Lunch')
    const message = (input: object) => {
      const result = blockedTimeSchema.safeParse(input)
      return result.success ? null : result.error.issues[0].message
    }
    expect(message({ ...base, label: ' ', preset: 'every_day' })).toBe('Give the block a name')
    expect(message({ ...base, preset: 'pick', weekdays: [] })).toBe('Pick at least one day')
    expect(message({ ...base, end_time: '13:00', preset: 'every_day' })).toBe('End time must be after the start time')
    expect(message({ ...base, end_time: '12:00', preset: 'every_day' })).toBe('End time must be after the start time')
    expect(message({ ...base, ends_on: '2026-11-02', preset: 'every_day' })).toBe('The end date can’t be before the start date')
  })

  it('keeps an open end date for repeating blocks', () => {
    expect(blockedTimeSchema.parse({ ...base, preset: 'every_day' }).ends_on).toBeNull()
  })
})

describe('isoWeekday', () => {
  it('numbers Monday 1 and Sunday 7', () => {
    expect(isoWeekday('2026-11-02')).toBe(1)
    expect(isoWeekday('2026-11-08')).toBe(7)
  })
})

describe('describeBlockedTime', () => {
  const block = { start_time: '13:00:00', end_time: '14:00:00', starts_on: '2026-11-03', ends_on: null }

  it('summarises a repeating block', () => {
    expect(describeBlockedTime({ ...block, weekdays: [1, 2, 3, 4, 5] })).toBe('Mon–Fri · 13:00–14:00 · from 3 Nov 2026')
    expect(describeBlockedTime({ ...block, weekdays: [1, 2, 3, 4, 5, 6, 7] })).toBe('Every day · 13:00–14:00 · from 3 Nov 2026')
    expect(describeBlockedTime({ ...block, weekdays: [5, 1] })).toBe('Mon, Fri · 13:00–14:00 · from 3 Nov 2026')
  })

  it('shows the end date when there is one', () => {
    expect(describeBlockedTime({ ...block, weekdays: [1], ends_on: '2026-12-01' })).toBe('Mon · 13:00–14:00 · 3 Nov 2026 to 1 Dec 2026')
  })

  it('summarises a one-off by its date', () => {
    expect(describeBlockedTime({ ...block, weekdays: [2], ends_on: '2026-11-03' })).toBe('Tue 3 Nov 2026 · 13:00–14:00')
  })
})

describe('findBlockClashes', () => {
  const occurrences = [{ startAt: '2026-11-03T05:00:00.000Z', endAt: '2026-11-03T06:00:00.000Z' }]
  const item = (startAt: string, endAt: string) => ({ startAt, endAt })

  it('finds bookings that overlap a block', () => {
    const inside = item('2026-11-03T05:30:00.000Z', '2026-11-03T06:30:00.000Z')
    expect(findBlockClashes(occurrences, [inside])).toEqual([inside])
  })

  it('does not count bookings that only touch the block edges', () => {
    const before = item('2026-11-03T04:00:00.000Z', '2026-11-03T05:00:00.000Z')
    const after = item('2026-11-03T06:00:00.000Z', '2026-11-03T07:00:00.000Z')
    expect(findBlockClashes(occurrences, [before, after])).toEqual([])
  })

  it('lists a booking once even when it spans several occurrences', () => {
    const twice = [...occurrences, { startAt: '2026-11-03T05:30:00.000Z', endAt: '2026-11-03T06:30:00.000Z' }]
    expect(findBlockClashes(twice, [item('2026-11-03T05:00:00.000Z', '2026-11-03T07:00:00.000Z')])).toHaveLength(1)
  })
})

describe('hkDateRangeToInstants', () => {
  it('covers whole Hong Kong days, end date included', () => {
    expect(hkDateRangeToInstants('2026-11-03', '2026-11-03')).toEqual({
      from: '2026-11-02T16:00:00.000Z',
      to: '2026-11-03T16:00:00.000Z',
    })
    expect(hkDateRangeToInstants('2026-11-03', '2026-11-05').to).toBe('2026-11-05T16:00:00.000Z')
  })
})
