import type { Database } from '@/types/database'

type CalendarItemRow = Database['public']['Views']['scheduler_calendar_items']['Row']
type BookingRow = Database['public']['Tables']['scheduler_bookings']['Row']

/** A cancelled booking as read from the base table, with the room fields the calendar shows. */
export type CancelledBookingRow = BookingRow & {
  room: {
    display_name: string
    floor: string | null
    room_number: string | null
    location: { name: string } | null
  } | null
}

/**
 * Shapes a cancelled booking like a row of `scheduler_calendar_items`. The view
 * only holds active bookings, so the "Cancelled" filter reads the base table
 * and maps rows through here to render them with the same adapter.
 */
export function cancelledBookingToCalendarRow(row: CancelledBookingRow): CalendarItemRow {
  return {
    source: 'booking',
    source_id: row.id,
    booking_id: row.id,
    title: row.title,
    booking_type: row.booking_type,
    status: row.status,
    start_at: row.start_at,
    end_at: row.end_at,
    local_date: row.local_date,
    location_type: row.location_type,
    room_id: row.room_id,
    room_name: row.room?.display_name ?? null,
    floor: row.room?.floor ?? null,
    room_number: row.room?.room_number ?? null,
    location_name: row.room?.location?.name ?? null,
    seats_required: row.seats_required,
    is_exclusive: row.is_exclusive,
    organiser_id: row.organiser_id,
    student_id: row.student_id,
    application_id: row.application_id,
    exam_id: row.exam_id,
    school_id: row.school_id,
    online_link: row.online_link,
    notes: row.notes,
    created_by: row.created_by,
  }
}
