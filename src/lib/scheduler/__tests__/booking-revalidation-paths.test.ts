import { describe, it, expect } from 'vitest'
import { bookingRevalidationPaths } from '../booking-revalidation-paths'

describe('bookingRevalidationPaths', () => {
  it('always refreshes the calendar, even when the booking could not be loaded', () => {
    expect(bookingRevalidationPaths(null)).toEqual(['/scheduler'])
    expect(bookingRevalidationPaths(undefined)).toEqual(['/scheduler'])
  })

  it('refreshes the student page when the booking has a student', () => {
    expect(bookingRevalidationPaths({ student_id: 'student-amy', booking_type: 'consultation' }))
      .toEqual(['/scheduler', '/students/student-amy'])
  })

  it('refreshes the exams page for an examination that has no linked exam request', () => {
    expect(bookingRevalidationPaths({ booking_type: 'examination', exam_id: null })).toContain('/exams')
    expect(bookingRevalidationPaths({ booking_type: 'group_examination' })).toContain('/exams')
  })

  it('refreshes the exams page when an exam request is linked', () => {
    expect(bookingRevalidationPaths({ booking_type: 'examination', exam_id: 'exam-1', student_id: 'student-amy' }))
      .toEqual(['/scheduler', '/students/student-amy', '/exams'])
  })

  it('leaves the exams page alone for other booking types', () => {
    expect(bookingRevalidationPaths({ booking_type: 'internal_meeting' })).toEqual(['/scheduler'])
    expect(bookingRevalidationPaths({ booking_type: 'room_reservation', student_id: null })).toEqual(['/scheduler'])
  })
})
