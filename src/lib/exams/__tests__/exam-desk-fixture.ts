import type { ExamDeskBooking, ExamDeskStudent } from '@/lib/supabase/queries/exam-desk'

export const lucas: ExamDeskStudent = { id: 'student-lucas', first_name: 'Lucas', surname: 'Ng', student_code: 'S001' }
export const emma: ExamDeskStudent = { id: 'student-emma', first_name: 'Emma', surname: 'Chan', student_code: 'S002' }

type Attendee = ExamDeskBooking['attendees'][number]

export function candidate(student: ExamDeskStudent, seatNo: number | null = null): Attendee {
  return { student_id: student.id, profile_id: null, role: 'candidate', seat_no: seatNo, student }
}

export function officer(profileId = 'profile-olivia'): Attendee {
  return { student_id: null, profile_id: profileId, role: 'officer', seat_no: null, student: null }
}

/**
 * A confirmed examination for Lucas Ng on Wed 14/10/2026, 09:00-10:30 HKT, in
 * the Exam Room on seat 1, for a 2027 application to Headington School.
 */
export function makeDeskBooking(overrides: Partial<ExamDeskBooking> = {}): ExamDeskBooking {
  return {
    id: 'booking-1',
    title: 'Entrance exam: Lucas Ng',
    booking_type: 'examination',
    status: 'confirmed',
    attendance: null,
    start_at: '2026-10-14T01:00:00.000Z',
    end_at: '2026-10-14T02:30:00.000Z',
    local_date: '2026-10-14',
    location_type: 'room',
    student_id: lucas.id,
    exam_id: null,
    assessment_snapshot: { label: 'English, Mathematics' },
    room: { id: 'room-exam', display_name: 'Exam Room', floor: '14/F', room_number: '1401' },
    student: lucas,
    school: null,
    application: { entry_year: 2027, school: { id: 'school-headington', name: 'Headington School' } },
    attendees: [candidate(lucas, 1)],
    ...overrides,
  }
}
