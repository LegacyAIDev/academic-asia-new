import { describe, it, expect } from 'vitest'
import {
  attendeeSchema,
  bookingFormSchema,
  cancelReasonSchema,
  moveBookingSchema,
  type BookingFormInput,
} from '../booking-schema'

const ROOM_ID = '11111111-1111-1111-1111-111111111111'
const STUDENT_ID = '22222222-2222-2222-2222-222222222222'
const PROFILE_ID = '33333333-3333-3333-3333-333333333333'
const OTHER_STUDENT_ID = '44444444-4444-4444-4444-444444444444'

/** A minimal, otherwise-valid internal meeting booking in a room; tests override just what they need. */
function baseBooking(overrides: Partial<BookingFormInput> = {}): BookingFormInput {
  return {
    title: 'Team sync',
    booking_type: 'internal_meeting',
    start_at: '2026-03-15T01:00:00.000Z',
    end_at: '2026-03-15T02:00:00.000Z',
    location_type: 'room',
    room_id: ROOM_ID,
    attendees: [],
    ...overrides,
  }
}

function issuePaths(result: { success: boolean; error?: { issues: { path: (string | number)[] }[] } }): string[] {
  if (result.success) return []
  return result.error!.issues.map(i => String(i.path[0]))
}

describe('bookingFormSchema - happy path', () => {
  it('accepts a valid internal meeting booked in a room', () => {
    const result = bookingFormSchema.safeParse(baseBooking())
    expect(result.success).toBe(true)
  })
})

describe('bookingFormSchema - location rules', () => {
  it('rejects an online booking with no link', () => {
    const result = bookingFormSchema.safeParse(
      baseBooking({ location_type: 'online', room_id: null, online_link: null }),
    )
    expect(result.success).toBe(false)
    expect(issuePaths(result)).toContain('online_link')
  })

  it('rejects an online booking that still has a room_id', () => {
    const result = bookingFormSchema.safeParse(
      baseBooking({ location_type: 'online', room_id: ROOM_ID, online_link: 'https://meet.example.com/abc' }),
    )
    expect(result.success).toBe(false)
    expect(issuePaths(result)).toContain('room_id')
  })

  it('accepts a valid online booking with a link and no room', () => {
    const result = bookingFormSchema.safeParse(
      baseBooking({ location_type: 'online', room_id: null, online_link: 'https://meet.example.com/abc' }),
    )
    expect(result.success).toBe(true)
  })

  it('rejects a room booking with no room_id', () => {
    const result = bookingFormSchema.safeParse(baseBooking({ room_id: null }))
    expect(result.success).toBe(false)
    expect(issuePaths(result)).toContain('room_id')
  })
})

describe('bookingFormSchema - time rules', () => {
  it('rejects end_at before start_at', () => {
    const result = bookingFormSchema.safeParse(
      baseBooking({ start_at: '2026-03-15T02:00:00.000Z', end_at: '2026-03-15T01:00:00.000Z' }),
    )
    expect(result.success).toBe(false)
    expect(issuePaths(result)).toContain('end_at')
  })

  it('rejects end_at equal to start_at', () => {
    const result = bookingFormSchema.safeParse(
      baseBooking({ start_at: '2026-03-15T01:00:00.000Z', end_at: '2026-03-15T01:00:00.000Z' }),
    )
    expect(result.success).toBe(false)
    expect(issuePaths(result)).toContain('end_at')
  })
})

describe('bookingFormSchema - online link format', () => {
  it('rejects a javascript: link', () => {
    const result = bookingFormSchema.safeParse(
      baseBooking({ location_type: 'online', room_id: null, online_link: 'javascript:alert(1)' }),
    )
    expect(result.success).toBe(false)
    expect(issuePaths(result)).toContain('online_link')
  })

  it('accepts an https:// link', () => {
    const result = bookingFormSchema.safeParse(
      baseBooking({ location_type: 'online', room_id: null, online_link: 'https://meet.example.com/abc' }),
    )
    expect(result.success).toBe(true)
  })
})

describe('bookingFormSchema - examination', () => {
  it('requires student_id', () => {
    const result = bookingFormSchema.safeParse(baseBooking({ booking_type: 'examination', student_id: null }))
    expect(result.success).toBe(false)
    expect(issuePaths(result)).toContain('student_id')
  })

  it('requires the booking to be in a room', () => {
    const result = bookingFormSchema.safeParse(
      baseBooking({
        booking_type: 'examination',
        student_id: STUDENT_ID,
        location_type: 'online',
        room_id: null,
        online_link: 'https://meet.example.com/abc',
      }),
    )
    expect(result.success).toBe(false)
    expect(issuePaths(result)).toContain('location_type')
  })

  it('accepts a valid examination booking', () => {
    const result = bookingFormSchema.safeParse(baseBooking({ booking_type: 'examination', student_id: STUDENT_ID }))
    expect(result.success).toBe(true)
  })
})

describe('bookingFormSchema - group_examination', () => {
  it('requires at least one candidate', () => {
    const result = bookingFormSchema.safeParse(
      baseBooking({ booking_type: 'group_examination', seats_required: 1, attendees: [] }),
    )
    expect(result.success).toBe(false)
    expect(issuePaths(result)).toContain('attendees')
  })

  it('requires seats_required to cover all candidates', () => {
    const result = bookingFormSchema.safeParse(
      baseBooking({
        booking_type: 'group_examination',
        seats_required: 1,
        attendees: [
          { student_id: STUDENT_ID, role: 'candidate' },
          { student_id: OTHER_STUDENT_ID, role: 'candidate' },
        ],
      }),
    )
    expect(result.success).toBe(false)
    expect(issuePaths(result)).toContain('seats_required')
  })

  it('accepts a valid group examination with enough seats', () => {
    const result = bookingFormSchema.safeParse(
      baseBooking({
        booking_type: 'group_examination',
        seats_required: 2,
        attendees: [
          { student_id: STUDENT_ID, role: 'candidate', seat_no: 1 },
          { student_id: OTHER_STUDENT_ID, role: 'candidate', seat_no: 2 },
        ],
      }),
    )
    expect(result.success).toBe(true)
  })
})

describe('bookingFormSchema - room_reservation', () => {
  it('requires notes describing the purpose', () => {
    const result = bookingFormSchema.safeParse(baseBooking({ booking_type: 'room_reservation', notes: null }))
    expect(result.success).toBe(false)
    expect(issuePaths(result)).toContain('notes')
  })

  it('rejects blank notes', () => {
    const result = bookingFormSchema.safeParse(baseBooking({ booking_type: 'room_reservation', notes: '   ' }))
    expect(result.success).toBe(false)
    expect(issuePaths(result)).toContain('notes')
  })

  it('accepts a room reservation with notes', () => {
    const result = bookingFormSchema.safeParse(
      baseBooking({ booking_type: 'room_reservation', notes: 'Blocking the room for a client visit' }),
    )
    expect(result.success).toBe(true)
  })
})

describe('bookingFormSchema - seats', () => {
  it('rejects duplicate seat numbers', () => {
    const result = bookingFormSchema.safeParse(
      baseBooking({
        attendees: [
          { student_id: STUDENT_ID, seat_no: 1 },
          { student_id: OTHER_STUDENT_ID, seat_no: 1 },
        ],
      }),
    )
    expect(result.success).toBe(false)
    expect(issuePaths(result)).toContain('attendees')
  })

  it('rejects seat numbers on a booking with no room', () => {
    const result = bookingFormSchema.safeParse(
      baseBooking({
        booking_type: 'other',
        location_type: 'online',
        room_id: null,
        online_link: 'https://meet.example.com/abc',
        attendees: [{ student_id: STUDENT_ID, seat_no: 1 }],
      }),
    )
    expect(result.success).toBe(false)
    expect(issuePaths(result)).toContain('attendees')
  })

  it('accepts distinct seat numbers in a room', () => {
    const result = bookingFormSchema.safeParse(
      baseBooking({
        attendees: [
          { student_id: STUDENT_ID, seat_no: 1 },
          { student_id: OTHER_STUDENT_ID, seat_no: 2 },
        ],
      }),
    )
    expect(result.success).toBe(true)
  })
})

describe('attendeeSchema', () => {
  it('accepts a staff attendee (profile_id only)', () => {
    expect(attendeeSchema.safeParse({ profile_id: PROFILE_ID }).success).toBe(true)
  })

  it('accepts a student attendee (student_id only)', () => {
    expect(attendeeSchema.safeParse({ student_id: STUDENT_ID }).success).toBe(true)
  })

  it('rejects an attendee with neither profile_id nor student_id', () => {
    expect(attendeeSchema.safeParse({}).success).toBe(false)
  })

  it('rejects an attendee with both profile_id and student_id', () => {
    expect(attendeeSchema.safeParse({ profile_id: PROFILE_ID, student_id: STUDENT_ID }).success).toBe(false)
  })
})

describe('cancelReasonSchema', () => {
  it('rejects a reason shorter than 3 characters', () => {
    expect(cancelReasonSchema.safeParse({ reason: 'no' }).success).toBe(false)
  })

  it('accepts a reason of at least 3 characters', () => {
    expect(cancelReasonSchema.safeParse({ reason: 'Room double-booked' }).success).toBe(true)
  })
})

describe('moveBookingSchema', () => {
  it('accepts a valid move with a reason', () => {
    const result = moveBookingSchema.safeParse({
      start_at: '2026-03-15T01:00:00.000Z',
      end_at: '2026-03-15T02:00:00.000Z',
      room_id: ROOM_ID,
      reason: 'Room conflict resolved',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a move with too short a reason', () => {
    const result = moveBookingSchema.safeParse({
      start_at: '2026-03-15T01:00:00.000Z',
      end_at: '2026-03-15T02:00:00.000Z',
      reason: 'ok',
    })
    expect(result.success).toBe(false)
  })
})
