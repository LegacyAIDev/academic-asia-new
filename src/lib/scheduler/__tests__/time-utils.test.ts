import { describe, it, expect } from 'vitest'
import { formatHkDate, formatHkTime, normaliseSelection } from '../time-utils'

describe('normaliseSelection - month view (all-day) selections', () => {
  it('turns a one-day selection into a one-hour slot at 09:00 HKT', () => {
    // 2026-10-14 in Hong Kong runs from 2026-10-13T16:00Z to 2026-10-14T16:00Z.
    const result = normaliseSelection({
      start: '2026-10-13T16:00:00.000Z',
      end: '2026-10-14T16:00:00.000Z',
      allDay: true,
    })
    expect(result.start).toBe('2026-10-14T01:00:00.000Z')
    expect(result.end).toBe('2026-10-14T02:00:00.000Z')
    expect(result.allDay).toBe(false)
  })

  it('treats a start given as UTC midnight as the same calendar day', () => {
    const result = normaliseSelection({
      start: '2026-10-14T00:00:00.000Z',
      end: '2026-10-15T00:00:00.000Z',
      allDay: true,
    })
    expect(result.start).toBe('2026-10-14T01:00:00.000Z')
    expect(result.end).toBe('2026-10-14T02:00:00.000Z')
  })

  it('reads the day in Hong Kong time, not UTC', () => {
    // 20:00Z on the 14th is already 04:00 on the 15th in Hong Kong.
    const result = normaliseSelection({
      start: '2026-10-14T20:00:00.000Z',
      end: '2026-10-15T20:00:00.000Z',
      allDay: true,
    })
    expect(result.start).toBe('2026-10-15T01:00:00.000Z')
  })

  it('collapses a multi-day drag to one hour on the first day', () => {
    const result = normaliseSelection({
      start: '2026-10-13T16:00:00.000Z',
      end: '2026-10-16T16:00:00.000Z',
      allDay: true,
    })
    expect(result.start).toBe('2026-10-14T01:00:00.000Z')
    expect(new Date(result.end).getTime() - new Date(result.start).getTime()).toBe(60 * 60_000)
  })

  it('preserves the resource id and any other fields', () => {
    const result = normaliseSelection({
      start: '2026-10-13T16:00:00.000Z',
      end: '2026-10-14T16:00:00.000Z',
      allDay: true,
      resourceId: 'p:abc',
    })
    expect(result.resourceId).toBe('p:abc')
  })

  it('does not mutate the selection it was given', () => {
    const input = { start: '2026-10-13T16:00:00.000Z', end: '2026-10-14T16:00:00.000Z', allDay: true }
    normaliseSelection(input)
    expect(input).toEqual({ start: '2026-10-13T16:00:00.000Z', end: '2026-10-14T16:00:00.000Z', allDay: true })
  })
})

describe('normaliseSelection - timed selections', () => {
  it('returns a timed selection with the same values', () => {
    const input = { start: '2026-10-14T03:15:00.000Z', end: '2026-10-14T04:45:00.000Z', allDay: false, resourceId: 'room-1' }
    expect(normaliseSelection(input)).toEqual(input)
  })

  it('treats a missing allDay flag as timed', () => {
    const input = { start: '2026-10-14T03:15:00.000Z', end: '2026-10-14T04:45:00.000Z' }
    expect(normaliseSelection(input)).toEqual(input)
  })

  it('keeps a selection that is just over one slot as dragged', () => {
    const input = { start: '2026-10-14T03:00:00.000Z', end: '2026-10-14T03:30:00.000Z' }
    expect(normaliseSelection(input)).toEqual(input)
  })
})

describe('normaliseSelection - single click in the time grid', () => {
  it('stretches a one-slot (15 minute) click to one hour', () => {
    const result = normaliseSelection({ start: '2026-10-14T03:00:00.000Z', end: '2026-10-14T03:15:00.000Z' })
    expect(result.start).toBe('2026-10-14T03:00:00.000Z')
    expect(result.end).toBe('2026-10-14T04:00:00.000Z')
  })

  it('stretches anything shorter than a slot too', () => {
    const result = normaliseSelection({ start: '2026-10-14T03:00:00.000Z', end: '2026-10-14T03:05:00.000Z' })
    expect(result.end).toBe('2026-10-14T04:00:00.000Z')
  })

  it('stretches an empty range where start equals end', () => {
    const result = normaliseSelection({ start: '2026-10-14T03:00:00.000Z', end: '2026-10-14T03:00:00.000Z' })
    expect(result.end).toBe('2026-10-14T04:00:00.000Z')
  })

  it('keeps the resource id and the explicit timed flag', () => {
    const result = normaliseSelection({
      start: '2026-10-14T03:00:00.000Z',
      end: '2026-10-14T03:15:00.000Z',
      allDay: false,
      resourceId: 'room-1',
    })
    expect(result).toEqual({
      start: '2026-10-14T03:00:00.000Z',
      end: '2026-10-14T04:00:00.000Z',
      allDay: false,
      resourceId: 'room-1',
    })
  })

  it('does not mutate the selection it was given', () => {
    const input = { start: '2026-10-14T03:00:00.000Z', end: '2026-10-14T03:15:00.000Z' }
    normaliseSelection(input)
    expect(input).toEqual({ start: '2026-10-14T03:00:00.000Z', end: '2026-10-14T03:15:00.000Z' })
  })
})

describe('formatHkDate and formatHkTime', () => {
  it('render the Hong Kong wall clock for an instant', () => {
    expect(formatHkDate('2026-10-14T01:00:00.000Z')).toBe('14/10/2026')
    expect(formatHkTime('2026-10-14T01:00:00.000Z')).toBe('09:00')
  })

  it('roll over to the next Hong Kong day after 16:00Z', () => {
    expect(formatHkDate('2026-10-14T16:30:00.000Z')).toBe('15/10/2026')
    expect(formatHkTime('2026-10-14T16:30:00.000Z')).toBe('00:30')
  })
})
