import { isExamBooking } from './config'

type ChangedBooking = { student_id?: string | null; exam_id?: string | null; booking_type?: string | null }

/**
 * Pages that show a booking and therefore need fresh data after it changes.
 * Kept apart from the server actions so the rule can be tested on its own.
 */
export function bookingRevalidationPaths(booking: ChangedBooking | null | undefined): string[] {
  const paths = ['/scheduler']
  if (booking?.student_id) paths.push(`/students/${booking.student_id}`)
  // The exam desk lists every examination booking, with or without a linked exam request.
  if (booking?.exam_id || isExamBooking(booking?.booking_type ?? '')) paths.push('/exams')
  return paths
}
