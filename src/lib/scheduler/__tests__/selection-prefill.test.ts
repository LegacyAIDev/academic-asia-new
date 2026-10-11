import { describe, it, expect } from 'vitest'
import { prefillFromSelection, slotFromGridAttributes } from '../selection-prefill'

const ME = '11111111-1111-4111-8111-111111111111'
const COLLEAGUE = '22222222-2222-4222-8222-222222222222'
const STUDENT = '33333333-3333-4333-8333-333333333333'
const ROOM = '44444444-4444-4444-8444-444444444444'

const timed = { start: '2026-10-14T03:00:00.000Z', end: '2026-10-14T04:00:00.000Z' }
const times = { start_at: timed.start, end_at: timed.end }

describe('prefillFromSelection', () => {
  it('returns nothing without a selection', () => {
    expect(prefillFromSelection(undefined, 'my', ME)).toEqual({})
    expect(prefillFromSelection(undefined, 'rooms', ME)).toEqual({})
    expect(prefillFromSelection(undefined, 'team', ME)).toEqual({})
  })

  it('my view only sets the start and end', () => {
    expect(prefillFromSelection(timed, 'my', ME)).toEqual(times)
  })

  it('rooms view with a column pre-selects that room as the location', () => {
    expect(prefillFromSelection({ ...timed, resourceId: ROOM }, 'rooms', ME)).toEqual({
      ...times,
      room_id: ROOM,
      location_type: 'room',
    })
  })

  it('rooms view without a column only sets the times', () => {
    expect(prefillFromSelection(timed, 'rooms', ME)).toEqual(times)
  })

  it('team view student column starts a consultation with that student', () => {
    expect(prefillFromSelection({ ...timed, resourceId: `s:${STUDENT}` }, 'team', ME)).toEqual({
      ...times,
      booking_type: 'consultation',
      student_id: STUDENT,
    })
  })

  it('team view colleague column adds that colleague as a full staff attendee', () => {
    expect(prefillFromSelection({ ...timed, resourceId: `p:${COLLEAGUE}` }, 'team', ME)).toEqual({
      ...times,
      attendees: [{ profile_id: COLLEAGUE, student_id: null, role: 'staff', seat_no: null, application_id: null }],
    })
  })

  it('team view colleague column leaves the booking type to its default', () => {
    expect(prefillFromSelection({ ...timed, resourceId: `p:${COLLEAGUE}` }, 'team', ME)).not.toHaveProperty('booking_type')
  })

  it('team view own column adds no attendee since the user is the organiser', () => {
    const prefill = prefillFromSelection({ ...timed, resourceId: `p:${ME}` }, 'team', ME)
    expect(prefill).toEqual(times)
    expect(prefill).not.toHaveProperty('attendees')
  })

  it('team view ignores a column key with an unknown prefix', () => {
    expect(prefillFromSelection({ ...timed, resourceId: 'x:whatever' }, 'team', ME)).toEqual(times)
  })

  it('team view does not touch room fields for a person column', () => {
    const prefill = prefillFromSelection({ ...timed, resourceId: `p:${COLLEAGUE}` }, 'team', ME)
    expect(prefill).not.toHaveProperty('room_id')
    expect(prefill).not.toHaveProperty('location_type')
  })

  it('person columns are only applied in the team view', () => {
    for (const resourceId of [`p:${COLLEAGUE}`, `s:${STUDENT}`]) {
      expect(prefillFromSelection({ ...timed, resourceId }, 'my', ME)).toEqual(times)
    }
  })

  it('a room id is not mistaken for a person column in the team view', () => {
    expect(prefillFromSelection({ ...timed, resourceId: ROOM }, 'team', ME)).toEqual(times)
  })
})

describe('prefillFromSelection - clicks and all-day selections', () => {
  const allDay = { start: '2026-10-13T16:00:00.000Z', end: '2026-10-14T16:00:00.000Z', allDay: true }
  const oneHourAt9 = { start_at: '2026-10-14T01:00:00.000Z', end_at: '2026-10-14T02:00:00.000Z' }

  it('stretches a single click in the time grid to a one-hour slot', () => {
    const click = { start: '2026-10-14T03:30:00.000Z', end: '2026-10-14T03:45:00.000Z' }
    expect(prefillFromSelection(click, 'my', ME)).toEqual({
      start_at: click.start,
      end_at: '2026-10-14T04:30:00.000Z',
    })
  })

  it('stretches a single click and still applies the column', () => {
    const click = { start: '2026-10-14T03:30:00.000Z', end: '2026-10-14T03:45:00.000Z', resourceId: ROOM }
    expect(prefillFromSelection(click, 'rooms', ME)).toEqual({
      start_at: click.start,
      end_at: '2026-10-14T04:30:00.000Z',
      room_id: ROOM,
      location_type: 'room',
    })
  })

  it('keeps a drag longer than one slot as dragged', () => {
    const drag = { start: '2026-10-14T03:30:00.000Z', end: '2026-10-14T04:15:00.000Z' }
    expect(prefillFromSelection(drag, 'my', ME)).toEqual({ start_at: drag.start, end_at: drag.end })
  })

  it('normalises an all-day selection to a one-hour slot at 09:00 HKT', () => {
    expect(prefillFromSelection(allDay, 'my', ME)).toEqual(oneHourAt9)
  })

  it('still applies the column once an all-day selection is normalised', () => {
    expect(prefillFromSelection({ ...allDay, resourceId: `s:${STUDENT}` }, 'team', ME)).toEqual({
      ...oneHourAt9,
      booking_type: 'consultation',
      student_id: STUDENT,
    })
  })
})

describe('slotFromGridAttributes', () => {
  it('builds a one-hour slot from the date and time of a grid cell', () => {
    expect(slotFromGridAttributes('2026-10-14', '10:30:00', 'room-1')).toEqual({
      start: '2026-10-14T02:30:00.000Z',
      end: '2026-10-14T03:30:00.000Z',
      resourceId: 'room-1',
    })
  })

  it('accepts a time without seconds', () => {
    expect(slotFromGridAttributes('2026-10-14', '10:30', undefined)?.start).toBe('2026-10-14T02:30:00.000Z')
  })

  it('reads the cell time as Hong Kong time', () => {
    // 00:30 HKT on the 14th is still the 13th in UTC.
    expect(slotFromGridAttributes('2026-10-14', '00:30:00', undefined)?.start).toBe('2026-10-13T16:30:00.000Z')
  })

  it.each([
    ['a missing time', undefined],
    ['an empty time', ''],
    ['a time that is not HH:mm', '1:30:00'],
    ['text instead of a time', 'noon'],
  ])('starts at 09:00 HKT for %s', (_label, time) => {
    expect(slotFromGridAttributes('2026-10-14', time, undefined)).toEqual({
      start: '2026-10-14T01:00:00.000Z',
      end: '2026-10-14T02:00:00.000Z',
      resourceId: undefined,
    })
  })

  it.each([
    ['a DD/MM/YYYY date', '14/10/2026'],
    ['a date without zero padding', '2026-1-4'],
    ['a date with trailing text', '2026-10-14T00:00'],
    ['a missing date', undefined],
    ['an empty date', ''],
  ])('returns null for %s', (_label, date) => {
    expect(slotFromGridAttributes(date, '10:30:00', 'room-1')).toBeNull()
  })

  it('keeps the resource id, and turns an empty one into undefined', () => {
    expect(slotFromGridAttributes('2026-10-14', '10:30:00', 'p:abc')?.resourceId).toBe('p:abc')
    expect(slotFromGridAttributes('2026-10-14', '10:30:00', '')?.resourceId).toBeUndefined()
    expect(slotFromGridAttributes('2026-10-14', '10:30:00', undefined)?.resourceId).toBeUndefined()
  })

  it('feeds prefillFromSelection like a clicked slot would', () => {
    const slot = slotFromGridAttributes('2026-10-14', '10:30:00', `s:${STUDENT}`)
    expect(prefillFromSelection(slot ?? undefined, 'team', ME)).toEqual({
      start_at: '2026-10-14T02:30:00.000Z',
      end_at: '2026-10-14T03:30:00.000Z',
      booking_type: 'consultation',
      student_id: STUDENT,
    })
  })
})
