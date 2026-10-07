import { describe, it, expect } from 'vitest'
import { combineBusinessDateTime, bookingInitialFromExam, type ExamForBooking } from '../exam-booking-defaults'

/** A fully-specified exam fixture; tests override only the fields relevant to the case. */
function makeExam(overrides: Partial<ExamForBooking> = {}): ExamForBooking {
  return {
    id: 'exam-1',
    title: null,
    subject: null,
    apply_year: null,
    duration_minutes: null,
    preferred_date: null,
    preferred_start_time: null,
    confirmed_date: null,
    confirmed_start_time: null,
    remarks: null,
    student_id: 'student-1',
    application_id: 'application-1',
    school_id: 'school-1',
    student: null,
    exam_type: null,
    ...overrides,
  }
}

describe('combineBusinessDateTime', () => {
  it('resolves to the correct UTC instant for a business-timezone date+time', () => {
    const iso = combineBusinessDateTime('2026-09-14', '09:00')
    // 09:00 HKT (UTC+8) is 01:00 UTC the same day
    expect(new Date(iso).toISOString()).toBe('2026-09-14T01:00:00.000Z')
  })

  it('produces an ISO string that parses to the same instant regardless of its own offset notation', () => {
    // NOTE: TZDate#toISOString() renders with the +08:00 offset rather than
    // normalizing to "Z" (see report) — assert on the parsed instant, not the raw string.
    const iso = combineBusinessDateTime('2026-01-01', '00:00')
    expect(new Date(iso).getTime()).toBe(new Date('2025-12-31T16:00:00.000Z').getTime())
  })
})

describe('bookingInitialFromExam', () => {
  it('prefers the confirmed date/time over the preferred one', () => {
    const exam = makeExam({
      confirmed_date: '2026-09-14',
      confirmed_start_time: '09:00',
      preferred_date: '2026-09-10',
      preferred_start_time: '14:00',
    })
    const result = bookingInitialFromExam(exam, '2026-09-01')
    expect(new Date(result.start_at!).toISOString()).toBe('2026-09-14T01:00:00.000Z')
  })

  it('falls back to the preferred date/time when there is no confirmed slot', () => {
    const exam = makeExam({ preferred_date: '2026-09-10', preferred_start_time: '14:00' })
    const result = bookingInitialFromExam(exam, '2026-09-01')
    expect(new Date(result.start_at!).toISOString()).toBe('2026-09-10T06:00:00.000Z')
  })

  it('falls back to today + 09:00 when neither confirmed nor preferred slot exists', () => {
    const exam = makeExam()
    const result = bookingInitialFromExam(exam, '2026-09-20')
    // 09:00 HKT default (DAY_START_TIME) on the given business-tz "today"
    expect(new Date(result.start_at!).toISOString()).toBe('2026-09-20T01:00:00.000Z')
  })

  it('sets end = start + duration_minutes', () => {
    const exam = makeExam({ confirmed_date: '2026-09-14', confirmed_start_time: '09:00', duration_minutes: 90 })
    const result = bookingInitialFromExam(exam, '2026-09-01')
    const diffMinutes = (new Date(result.end_at!).getTime() - new Date(result.start_at!).getTime()) / 60000
    expect(diffMinutes).toBe(90)
  })

  it('defaults duration to 60 minutes when not set', () => {
    const exam = makeExam({ confirmed_date: '2026-09-14', confirmed_start_time: '09:00', duration_minutes: null })
    const result = bookingInitialFromExam(exam, '2026-09-01')
    const diffMinutes = (new Date(result.end_at!).getTime() - new Date(result.start_at!).getTime()) / 60000
    expect(diffMinutes).toBe(60)
  })

  it('builds the title from the exam type label and student name', () => {
    const exam = makeExam({
      confirmed_date: '2026-09-14',
      confirmed_start_time: '09:00',
      exam_type: { label: 'Mock Exam' },
      student: { first_name: 'Jane', surname: 'Doe' },
    })
    const result = bookingInitialFromExam(exam, '2026-09-01')
    expect(result.title).toBe('Mock Exam: Jane Doe')
  })

  it('falls back to "Examination" and "Student" when exam type / student name are missing', () => {
    const exam = makeExam({ confirmed_date: '2026-09-14', confirmed_start_time: '09:00' })
    const result = bookingInitialFromExam(exam, '2026-09-01')
    expect(result.title).toBe('Examination: Student')
  })

  it('prefers the exam title verbatim when it is set', () => {
    const exam = makeExam({
      confirmed_date: '2026-09-14',
      confirmed_start_time: '09:00',
      title: 'Custom Exam Title',
      exam_type: { label: 'Mock Exam' },
    })
    const result = bookingInitialFromExam(exam, '2026-09-01')
    expect(result.title).toBe('Custom Exam Title')
  })

  it('builds the assessment snapshot label from subject and year', () => {
    const exam = makeExam({
      confirmed_date: '2026-09-14',
      confirmed_start_time: '09:00',
      subject: 'Mathematics',
      apply_year: '2026',
    })
    const result = bookingInitialFromExam(exam, '2026-09-01')
    expect(result.assessment_snapshot).toEqual({ label: 'Mathematics · Year 2026' })
  })

  it('omits the assessment snapshot when there is no subject or year', () => {
    const exam = makeExam({ confirmed_date: '2026-09-14', confirmed_start_time: '09:00' })
    const result = bookingInitialFromExam(exam, '2026-09-01')
    expect(result.assessment_snapshot).toBeNull()
  })

  it('copies exam_id, student_id, application_id and school_id through', () => {
    const exam = makeExam({
      id: 'exam-42',
      confirmed_date: '2026-09-14',
      confirmed_start_time: '09:00',
      student_id: 'student-42',
      application_id: 'application-42',
      school_id: 'school-42',
    })
    const result = bookingInitialFromExam(exam, '2026-09-01')
    expect(result.exam_id).toBe('exam-42')
    expect(result.student_id).toBe('student-42')
    expect(result.application_id).toBe('application-42')
    expect(result.school_id).toBe('school-42')
  })

  it('always sets booking_type to examination, location_type to room and seats_required to 1', () => {
    const exam = makeExam({ confirmed_date: '2026-09-14', confirmed_start_time: '09:00' })
    const result = bookingInitialFromExam(exam, '2026-09-01')
    expect(result.booking_type).toBe('examination')
    expect(result.location_type).toBe('room')
    expect(result.seats_required).toBe(1)
  })
})
