import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { ExamForBooking } from '@/lib/scheduler/exam-booking-defaults'

export type ExamBookingLink = { exam_id: string; booking_id: string; status: string }

/** Active (non-cancelled) scheduler booking per exam, keyed by exam id. */
export async function getExamBookingLinks(examIds: string[]): Promise<Record<string, ExamBookingLink>> {
  if (examIds.length === 0) return {}
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('scheduler_bookings')
    .select('id, exam_id, status')
    .in('exam_id', examIds)
    .neq('status', 'cancelled')

  if (error) {
    console.error('getExamBookingLinks failed:', error)
    return {}
  }

  const links: Record<string, ExamBookingLink> = {}
  for (const row of data ?? []) {
    if (row.exam_id) links[row.exam_id] = { exam_id: row.exam_id, booking_id: row.id, status: row.status }
  }
  return links
}

/** The exam record with the fields needed to pre-fill a booking. */
export async function getExamForBooking(examId: string): Promise<ExamForBooking | null> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('student_individual_exams')
    .select(
      `id, title, subject, apply_year, duration_minutes, preferred_date, preferred_start_time,
       confirmed_date, confirmed_start_time, remarks, student_id, application_id, school_id,
       student:students(first_name, surname), exam_type:individual_exam_types(label)`,
    )
    .eq('id', examId)
    .maybeSingle()

  if (error) {
    console.error('getExamForBooking failed:', error)
    return null
  }
  return (data as unknown as ExamForBooking | null) ?? null
}
