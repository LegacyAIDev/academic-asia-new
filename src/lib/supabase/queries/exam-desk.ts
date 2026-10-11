import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { daysBetween } from '@/lib/exams/exam-page-search-params'
import { EXAM_BOOKING_TYPES, MAX_RANGE_DAYS } from '@/lib/scheduler/config'
import type { Json } from '@/types/database'

/** PostgREST never returns more than this in one request, so the desk says so when it is reached. */
export const EXAM_DESK_MAX_ROWS = 1000

export type ExamDeskStudent = {
  id: string
  first_name: string | null
  surname: string | null
  student_code: string | null
}

type ExamDeskSchool = { id: string; name: string | null }

export type ExamDeskBooking = {
  id: string
  title: string
  booking_type: string
  status: string
  attendance: string | null
  start_at: string
  end_at: string
  local_date: string
  location_type: string
  student_id: string | null
  exam_id: string | null
  assessment_snapshot: Json | null
  room: { id: string; display_name: string; floor: string | null; room_number: string | null } | null
  student: ExamDeskStudent | null
  school: ExamDeskSchool | null
  application: { entry_year: number | null; school: ExamDeskSchool | null } | null
  attendees: {
    student_id: string | null
    profile_id: string | null
    role: string
    seat_no: number | null
    student: ExamDeskStudent | null
  }[]
}

const EXAM_DESK_SELECT = `id, title, booking_type, status, attendance, start_at, end_at, local_date, location_type,
  student_id, exam_id, assessment_snapshot,
  room:scheduler_rooms(id, display_name, floor, room_number),
  student:students(id, first_name, surname, student_code),
  school:schools(id, name),
  application:student_applications!scheduler_bookings_application_id_fkey(entry_year, school:schools(id, name)),
  attendees:scheduler_booking_attendees(student_id, profile_id, role, seat_no,
    student:students(id, first_name, surname, student_code))`

/**
 * Examination bookings for the exam desk, earliest first. The calendar view
 * cannot be used here because it carries neither attendance nor the school
 * name, so this reads the bookings table itself. Filtering beyond the date
 * range happens in memory (see src/lib/exams), where it can be unit-tested.
 *
 * Exam records from the old system that never got a scheduler booking are not
 * listed here; they are all in the past and stay reachable under "All exams".
 */
export async function getExamDeskBookings(range: { from: string; to: string }): Promise<ExamDeskBooking[]> {
  if (daysBetween(range.from, range.to) > MAX_RANGE_DAYS) {
    console.error('getExamDeskBookings: range exceeds', MAX_RANGE_DAYS, 'days')
    return []
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('scheduler_bookings')
    .select(EXAM_DESK_SELECT)
    .in('booking_type', EXAM_BOOKING_TYPES)
    .neq('status', 'cancelled')
    .gte('local_date', range.from)
    .lte('local_date', range.to)
    .order('start_at')
    .limit(EXAM_DESK_MAX_ROWS)

  if (error) {
    console.error('getExamDeskBookings failed:', error)
    return []
  }
  return (data ?? []) as unknown as ExamDeskBooking[]
}
