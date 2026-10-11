import { TZDate } from '@date-fns/tz'
import { format } from 'date-fns'
import type { BookingDetail } from '@/lib/supabase/queries/scheduler-bookings'
import { BOOKING_TYPE_LABELS, SCHEDULER_TIMEZONE, type BookingType } from './config'
import { personName } from './person-name'
import { formatHkTime } from './time-utils'

/**
 * Plain-text versions of a booking for pasting into email or WhatsApp (spec
 * CAL-09) and a family-ready version for examinations (spec CAL-10). Dates use
 * DD/MM/YYYY and 24-hour Hong Kong time, matching the rest of the app.
 */

function longDate(iso: string): string {
  return format(new TZDate(iso, SCHEDULER_TIMEZONE), 'EEEE dd/MM/yyyy')
}

function whenLines(booking: BookingDetail): string[] {
  return [
    `Date: ${longDate(booking.start_at)}`,
    `Time: ${formatHkTime(booking.start_at)}–${formatHkTime(booking.end_at)} (Hong Kong time)`,
  ]
}

function roomName(booking: BookingDetail): string | null {
  const room = booking.room
  if (!room) return null
  const where = [room.floor, room.room_number].filter(Boolean).join(' ')
  return where ? `${room.display_name} (${where})` : room.display_name
}

function placeLines(booking: BookingDetail): string[] {
  if (booking.location_type === 'online') return [`Online: ${booking.online_link ?? 'link to follow'}`]
  const location = booking.room?.location
  return [
    location ? `Location: ${location.name}` : '',
    location?.address ? `Address: ${location.address}` : '',
    roomName(booking) ? `Room: ${roomName(booking)}` : '',
  ]
}

function candidateSeat(booking: BookingDetail): number | null {
  const candidate = booking.attendees.find(a => a.student_id && a.student_id === booking.student_id)
  return candidate?.seat_no ?? null
}

/** The assessment name stored with a booking, read defensively because the column is free-form JSON. */
export function assessmentLabel(snapshot: unknown): string | null {
  if (snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)) {
    const label = (snapshot as { label?: unknown }).label
    if (typeof label === 'string' && label.trim()) return label.trim()
  }
  return null
}

/** Full booking summary for colleagues. */
export function formatBookingText(booking: BookingDetail): string {
  const attendees = booking.attendees.map(a => {
    const name = a.profile ? personName(a.profile) : personName(a.student)
    return `${name} (${a.role}${a.seat_no ? `, seat ${a.seat_no}` : ''})`
  })
  const seats = booking.location_type === 'room' && booking.room
    ? `Seats: ${booking.is_exclusive ? 'whole room' : `${booking.seats_required} of ${booking.room.capacity}`}`
    : ''

  return [
    booking.title,
    `Type: ${BOOKING_TYPE_LABELS[booking.booking_type as BookingType] ?? booking.booking_type}`,
    `Status: ${booking.status.charAt(0).toUpperCase()}${booking.status.slice(1)}`,
    ...whenLines(booking),
    ...placeLines(booking),
    seats,
    booking.organiser ? `Organiser: ${personName(booking.organiser)}` : '',
    booking.student ? `Student: ${personName(booking.student)}${booking.student.student_code ? ` (${booking.student.student_code})` : ''}` : '',
    attendees.length > 0 ? `Attendees: ${attendees.join('; ')}` : '',
    booking.notes ? `Notes: ${booking.notes}` : '',
    booking.instructions ? `Instructions: ${booking.instructions}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

/** Examination details written for the student's family. */
export function formatFamilyExamText(booking: BookingDetail): string {
  const seat = candidateSeat(booking)
  const assessment = assessmentLabel(booking.assessment_snapshot)

  return [
    'Examination details',
    booking.student ? `Student: ${personName(booking.student)}` : '',
    booking.school?.name ? `School: ${booking.school.name}` : '',
    assessment ? `Assessment: ${assessment}` : '',
    ...whenLines(booking),
    ...placeLines(booking),
    seat ? `Seat: ${seat}` : '',
    booking.instructions ? `Instructions: ${booking.instructions}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
