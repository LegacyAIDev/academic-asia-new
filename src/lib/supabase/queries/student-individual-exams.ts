import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type IndividualExamRecord = {
  id: string
  subject: string | null
  apply_year: string | null
  delivery_mode_id: number | null
  preferred_date: string | null
  preferred_start_time: string | null
  confirmed_date: string | null
  confirmed_start_time: string | null
  room: string | null
  seat_no: number | null
  score: number | null
  remarks: string | null
  status_id: number
}

/** Fetch AA Test exams for a student (exam_type_id = 1) */
export async function getStudentAATests(studentId: string): Promise<IndividualExamRecord[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('student_individual_exams')
    .select('id, subject, apply_year, delivery_mode_id, preferred_date, preferred_start_time, confirmed_date, confirmed_start_time, room, seat_no, score, remarks, status_id')
    .eq('student_id', studentId)
    .eq('exam_type_id', 1)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching AA tests:', error)
    return []
  }
  return (data ?? []) as IndividualExamRecord[]
}

/** Fetch all individual exams linked to a specific application */
export async function getExamsByApplicationId(applicationId: string): Promise<IndividualExamRecord[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('student_individual_exams')
    .select('id, subject, apply_year, delivery_mode_id, preferred_date, preferred_start_time, confirmed_date, confirmed_start_time, room, seat_no, score, remarks, status_id')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching individual exams:', error)
    return []
  }

  return (data ?? []) as IndividualExamRecord[]
}
