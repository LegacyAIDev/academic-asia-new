import { isUuid } from './uuid'

/**
 * PostgREST `or` filter for "bookings that involve these people": a booking
 * whose own student is one of the students, or one of the booking ids found
 * through attendees and organisers. Shared by the active and cancelled
 * calendar queries so both always match the same bookings.
 *
 * The ids are written into the filter string, so anything that is not a uuid
 * is dropped here as well as at the URL boundary. Returns null when nothing
 * can match, so callers can skip the query.
 */
export function peopleOrFilter(studentIds: string[], bookingIds: string[], idColumn: 'id' | 'booking_id'): string | null {
  const students = studentIds.filter(isUuid)
  const bookings = bookingIds.filter(isUuid)
  const clauses: string[] = []
  if (students.length > 0) clauses.push(`student_id.in.(${students.join(',')})`)
  if (bookings.length > 0) clauses.push(`${idColumn}.in.(${bookings.join(',')})`)
  return clauses.length > 0 ? clauses.join(',') : null
}
