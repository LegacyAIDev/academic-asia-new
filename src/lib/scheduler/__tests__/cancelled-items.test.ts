import { describe, it, expect } from 'vitest'
import { cancelledBookingToCalendarRow, type CancelledBookingRow } from '../cancelled-items'

/** A cancelled booking in a room, as the base-table query returns it. */
function makeCancelled(overrides: Partial<CancelledBookingRow> = {}): CancelledBookingRow {
  return {
    id: 'booking-9',
    title: 'Parent consultation',
    booking_type: 'consultation',
    status: 'cancelled',
    start_at: '2026-10-12T02:00:00.000Z',
    end_at: '2026-10-12T03:00:00.000Z',
    local_date: '2026-10-12',
    location_type: 'room',
    room_id: 'room-3',
    seats_required: 2,
    is_exclusive: false,
    organiser_id: 'profile-1',
    student_id: 'student-1',
    application_id: 'application-1',
    exam_id: 'exam-1',
    school_id: 'school-1',
    online_link: null,
    notes: 'Parent asked to move',
    created_by: 'profile-2',
    // Columns the calendar view does not carry; they must not leak into the row.
    assessment_set_id: 'set-1',
    assessment_snapshot: { label: 'Maths' },
    attendance: 'absent',
    confirmed_at: '2026-10-01T00:00:00.000Z',
    confirmed_by: 'profile-3',
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-02T00:00:00.000Z',
    instructions: 'Bring ID',
    period: null,
    room: {
      display_name: 'Meeting Room',
      floor: '14/F',
      room_number: 'R3',
      location: { name: 'Central Centre' },
    },
    ...overrides,
  }
}

describe('cancelledBookingToCalendarRow', () => {
  it('maps every calendar view column from the booking and its nested room', () => {
    expect(cancelledBookingToCalendarRow(makeCancelled())).toEqual({
      source: 'booking',
      source_id: 'booking-9',
      booking_id: 'booking-9',
      title: 'Parent consultation',
      booking_type: 'consultation',
      status: 'cancelled',
      start_at: '2026-10-12T02:00:00.000Z',
      end_at: '2026-10-12T03:00:00.000Z',
      local_date: '2026-10-12',
      location_type: 'room',
      room_id: 'room-3',
      room_name: 'Meeting Room',
      floor: '14/F',
      room_number: 'R3',
      location_name: 'Central Centre',
      seats_required: 2,
      is_exclusive: false,
      organiser_id: 'profile-1',
      student_id: 'student-1',
      application_id: 'application-1',
      exam_id: 'exam-1',
      school_id: 'school-1',
      online_link: null,
      notes: 'Parent asked to move',
      created_by: 'profile-2',
    })
  })

  it('uses the booking id as both source id and booking id', () => {
    const row = cancelledBookingToCalendarRow(makeCancelled({ id: 'abc' }))
    expect(row.source).toBe('booking')
    expect(row.source_id).toBe('abc')
    expect(row.booking_id).toBe('abc')
  })

  it('keeps the cancelled status so the calendar can style and lock it', () => {
    expect(cancelledBookingToCalendarRow(makeCancelled()).status).toBe('cancelled')
  })

  it('does not carry columns the view lacks', () => {
    const row = cancelledBookingToCalendarRow(makeCancelled()) as Record<string, unknown>
    for (const key of ['instructions', 'attendance', 'period', 'room', 'assessment_snapshot', 'confirmed_by']) {
      expect(row).not.toHaveProperty(key)
    }
  })

  it('returns null room fields for an online booking without a room', () => {
    const row = cancelledBookingToCalendarRow(
      makeCancelled({ room: null, room_id: null, location_type: 'online', online_link: 'https://meet.example/x' }),
    )
    expect(row).toMatchObject({
      room_id: null,
      room_name: null,
      floor: null,
      room_number: null,
      location_name: null,
      location_type: 'online',
      online_link: 'https://meet.example/x',
    })
  })

  it('returns a null location name when the room has no location', () => {
    const row = cancelledBookingToCalendarRow(
      makeCancelled({ room: { display_name: 'Meeting Room', floor: null, room_number: null, location: null } }),
    )
    expect(row.room_name).toBe('Meeting Room')
    expect(row.floor).toBeNull()
    expect(row.room_number).toBeNull()
    expect(row.location_name).toBeNull()
  })
})
