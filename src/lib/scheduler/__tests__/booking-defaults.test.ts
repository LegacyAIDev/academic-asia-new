import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultBookingInput } from '../booking-defaults'

const ME = '11111111-1111-4111-8111-111111111111'
const ROOM = '44444444-4444-4444-8444-444444444444'
const START = '2026-10-14T01:00:00.000Z'
const END = '2026-10-14T02:00:00.000Z'

afterEach(() => {
  vi.useRealTimers()
})

describe('defaultBookingInput - blank defaults', () => {
  it('opens a blank internal meeting organised by the current user', () => {
    const input = defaultBookingInput({ start_at: START, end_at: END }, ME)
    expect(input).toMatchObject({
      title: '',
      booking_type: 'internal_meeting',
      location_type: 'room',
      room_id: null,
      seats_required: 1,
      is_exclusive: false,
      organiser_id: ME,
      student_id: null,
      online_link: null,
      notes: null,
      instructions: null,
      attendees: [],
      override_person_conflicts: false,
      start_at: START,
      end_at: END,
    })
  })

  it('starts at the next 15-minute Hong Kong slot and lasts an hour when no times are given', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-14T01:07:00.000Z')) // 09:07 HKT
    const input = defaultBookingInput({}, ME)
    expect(new Date(input.start_at).toISOString()).toBe('2026-10-14T01:15:00.000Z')
    expect(new Date(input.end_at).toISOString()).toBe('2026-10-14T02:15:00.000Z')
  })

  it('defaults the end to one hour after a given start', () => {
    const input = defaultBookingInput({ start_at: START }, ME)
    expect(input.start_at).toBe(START)
    expect(new Date(input.end_at).toISOString()).toBe(END)
  })
})

describe('defaultBookingInput - undefined keys', () => {
  it('ignores keys passed as undefined', () => {
    const input = defaultBookingInput({ location_type: undefined, room_id: undefined }, ME)
    expect(input.location_type).toBe('room')
    expect(input.room_id).toBeNull()
  })

  it('ignores undefined for every kind of default, not only location and room', () => {
    const input = defaultBookingInput(
      { title: undefined, booking_type: undefined, organiser_id: undefined, attendees: undefined, seats_required: undefined },
      ME,
    )
    expect(input.title).toBe('')
    expect(input.booking_type).toBe('internal_meeting')
    expect(input.organiser_id).toBe(ME)
    expect(input.attendees).toEqual([])
    expect(input.seats_required).toBe(1)
  })

  it('falls back to computed times when start and end are undefined', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-14T01:00:00.000Z')) // exactly on a slot, 09:00 HKT
    const input = defaultBookingInput({ start_at: undefined, end_at: undefined }, ME)
    expect(new Date(input.start_at).toISOString()).toBe(START)
    expect(new Date(input.end_at).toISOString()).toBe(END)
  })

  it('does not leave undefined keys on the result', () => {
    const input = defaultBookingInput({ room_id: undefined, student_id: undefined }, ME)
    expect(Object.values(input)).not.toContain(undefined)
  })
})

describe('defaultBookingInput - defined keys override', () => {
  it('applies every defined key', () => {
    const input = defaultBookingInput(
      {
        title: 'Entrance exam',
        booking_type: 'examination',
        location_type: 'online',
        room_id: ROOM,
        organiser_id: null,
        student_id: 'student-1',
        attendees: [{ profile_id: ME, role: 'staff' }],
        start_at: START,
        end_at: '2026-10-14T03:30:00.000Z',
      },
      ME,
    )
    expect(input).toMatchObject({
      title: 'Entrance exam',
      booking_type: 'examination',
      location_type: 'online',
      room_id: ROOM,
      organiser_id: null,
      student_id: 'student-1',
      attendees: [{ profile_id: ME, role: 'staff' }],
      start_at: START,
      end_at: '2026-10-14T03:30:00.000Z',
    })
  })

  it('keeps an explicit null, which is a deliberate value rather than a missing one', () => {
    const input = defaultBookingInput({ room_id: null, organiser_id: null }, ME)
    expect(input.room_id).toBeNull()
    expect(input.organiser_id).toBeNull()
  })

  it('mixes defined and undefined keys', () => {
    const input = defaultBookingInput({ location_type: undefined, room_id: ROOM, start_at: START, end_at: END }, ME)
    expect(input.location_type).toBe('room')
    expect(input.room_id).toBe(ROOM)
  })
})
