import type { BookingAttendee, BookingDetail } from '@/lib/supabase/queries/scheduler-bookings'

/**
 * A confirmed room examination on Wed 14/10/2026, 09:00-11:00 HKT, with a
 * student, school and organiser but no attendees, notes or instructions.
 */
export function makeBookingDetail(overrides: Partial<BookingDetail> = {}): BookingDetail {
  return {
    id: 'booking-1',
    title: 'Mock exam',
    booking_type: 'examination',
    status: 'confirmed',
    start_at: '2026-10-14T01:00:00.000Z',
    end_at: '2026-10-14T03:00:00.000Z',
    local_date: '2026-10-14',
    location_type: 'room',
    room_id: 'room-1',
    seats_required: 4,
    is_exclusive: false,
    organiser_id: 'profile-olivia',
    student_id: 'student-amy',
    application_id: null,
    assessment_set_id: null,
    assessment_snapshot: null,
    attendance: null,
    confirmed_at: null,
    confirmed_by: null,
    created_at: '2026-10-01T00:00:00.000Z',
    created_by: null,
    updated_at: '2026-10-01T00:00:00.000Z',
    exam_id: null,
    school_id: 'school-1',
    instructions: null,
    notes: null,
    online_link: null,
    period: null,
    room: {
      id: 'room-1',
      display_name: 'Exam Room',
      floor: '14/F',
      room_number: 'R3',
      capacity: 12,
      location: { name: 'Central Centre', address: '1 Queens Road Central' },
    },
    organiser: { id: 'profile-olivia', first_name: 'Olivia', surname: 'Ng' },
    confirmer: null,
    student: { id: 'student-amy', first_name: 'Amy', surname: 'Chan', student_code: 'S001' },
    school: { id: 'school-1', name: 'Victoria Primary' },
    attendees: [],
    ...overrides,
  }
}

export function makeAttendee(overrides: Partial<BookingAttendee> = {}): BookingAttendee {
  return {
    id: 'attendee-1',
    profile_id: null,
    student_id: null,
    role: 'attendee',
    seat_no: null,
    application_id: null,
    profile: null,
    student: null,
    ...overrides,
  }
}
