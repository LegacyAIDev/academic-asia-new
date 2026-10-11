import type { CalendarItem } from '@/lib/supabase/queries/scheduler-bookings'

/** Every nullable view column defaulted to null, so each test only sets what it needs. */
export function makeItem(overrides: Partial<CalendarItem> = {}): CalendarItem {
  return {
    application_id: null,
    booking_id: 'booking-1',
    booking_type: 'internal_meeting',
    created_by: null,
    end_at: '2026-03-15T02:00:00.000Z',
    exam_id: null,
    floor: null,
    is_exclusive: null,
    local_date: '2026-03-15',
    location_name: null,
    location_type: null,
    notes: null,
    online_link: null,
    organiser_id: null,
    room_id: null,
    room_name: null,
    room_number: null,
    school_id: null,
    seats_required: null,
    source: 'booking',
    source_id: 'source-1',
    start_at: '2026-03-15T01:00:00.000Z',
    status: 'confirmed',
    student_id: null,
    title: 'Weekly sync',
    attendee_profile_ids: [],
    attendee_student_ids: [],
    ...overrides,
  }
}
