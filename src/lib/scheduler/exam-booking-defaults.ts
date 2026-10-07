import { TZDate } from '@date-fns/tz'
import { addMinutes } from 'date-fns'
import { DAY_START_TIME, DEFAULT_BOOKING_MINUTES, SCHEDULER_TIMEZONE } from './config'
import type { BookingFormInput } from './booking-schema'

/** The exam fields the booking dialog needs to pre-fill an examination booking. */
export type ExamForBooking = {
  id: string
  title: string | null
  subject: string | null
  apply_year: string | null
  duration_minutes: number | null
  preferred_date: string | null
  preferred_start_time: string | null
  confirmed_date: string | null
  confirmed_start_time: string | null
  remarks: string | null
  student_id: string
  application_id: string | null
  school_id: string | null
  student: { first_name: string | null; surname: string | null } | null
  exam_type: { label: string } | null
}

/** Combines a YYYY-MM-DD date and HH:mm(:ss) time in the business timezone into an ISO instant. */
export function combineBusinessDateTime(date: string, time: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  return new Date(new TZDate(y, m - 1, d, hh, mm ?? 0, SCHEDULER_TIMEZONE).getTime()).toISOString()
}

/** Booking dialog defaults for an exam request: confirmed slot if it has one, else the preferred one. */
export function bookingInitialFromExam(exam: ExamForBooking, todayBusinessDate: string): Partial<BookingFormInput> {
  const date = exam.confirmed_date ?? exam.preferred_date ?? todayBusinessDate
  const time = (exam.confirmed_date ? exam.confirmed_start_time : exam.preferred_start_time) ?? DAY_START_TIME
  const start = combineBusinessDateTime(date, time)
  const end = addMinutes(new Date(start), exam.duration_minutes ?? DEFAULT_BOOKING_MINUTES).toISOString()

  const studentName = `${exam.student?.first_name ?? ''} ${exam.student?.surname ?? ''}`.trim()
  const paper = [exam.subject, exam.apply_year ? `Year ${exam.apply_year}` : null].filter(Boolean).join(' · ')

  return {
    booking_type: 'examination',
    title: exam.title ?? `${exam.exam_type?.label ?? 'Examination'}: ${studentName || 'Student'}`,
    start_at: start,
    end_at: end,
    location_type: 'room',
    seats_required: 1,
    student_id: exam.student_id,
    application_id: exam.application_id,
    school_id: exam.school_id,
    exam_id: exam.id,
    assessment_snapshot: paper ? { label: paper } : null,
    notes: exam.remarks,
    attendees: [],
  }
}
