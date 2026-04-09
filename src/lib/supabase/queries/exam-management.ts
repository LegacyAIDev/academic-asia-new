import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type ExamManagementRecord = {
  id: string
  student_id: string
  exam_type_id: number
  subject: string | null
  apply_year: string | null
  preferred_date: string | null
  preferred_start_time: string | null
  confirmed_date: string | null
  confirmed_start_time: string | null
  room: string | null
  seat_no: number | null
  score: number | null
  remarks: string | null
  status_id: number
  created_at: string | null
  student: { id: string; first_name: string | null; surname: string | null; student_code: string | null } | null
  exam_type: { id: number; code: string; label: string } | null
}

export type ExamStats = { pending: number; confirmed: number; completed: number; total: number }

export type ExamListResult = {
  exams: ExamManagementRecord[]
  totalCount: number
  page: number
  totalPages: number
}

/** Fetch paginated exams with student + type joins, optional status filter */
export async function getAllExams(params: { statusId?: number; page?: number; pageSize?: number }): Promise<ExamListResult> {
  const { statusId, page = 1, pageSize = 50 } = params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('student_individual_exams')
    .select(`
      id, student_id, exam_type_id, subject, apply_year,
      preferred_date, preferred_start_time,
      confirmed_date, confirmed_start_time,
      room, seat_no, score, remarks, status_id, created_at,
      student:students!student_individual_exams_student_id_fkey(id, first_name, surname, student_code),
      exam_type:individual_exam_types(id, code, label)
    `, { count: 'exact' })
    .order('preferred_date', { ascending: true, nullsFirst: false })
    .range(offset, offset + pageSize - 1)

  if (statusId) {
    query = query.eq('status_id', statusId)
  }

  const { data, error, count } = await query
  if (error) {
    console.error('Error fetching exams for management:', error)
    return { exams: [], totalCount: 0, page, totalPages: 0 }
  }
  const totalCount = count ?? 0
  return {
    exams: (data ?? []) as unknown as ExamManagementRecord[],
    totalCount,
    page,
    totalPages: Math.ceil(totalCount / pageSize),
  }
}

/** Get counts per status for the dashboard stats */
export async function getExamStats(): Promise<ExamStats> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const [p, c, d] = await Promise.all([
    supabase.from('student_individual_exams').select('id', { count: 'exact', head: true }).eq('status_id', 1),
    supabase.from('student_individual_exams').select('id', { count: 'exact', head: true }).eq('status_id', 2),
    supabase.from('student_individual_exams').select('id', { count: 'exact', head: true }).eq('status_id', 3),
  ])

  const pending = p.count ?? 0
  const confirmed = c.count ?? 0
  const completed = d.count ?? 0
  return { pending, confirmed, completed, total: pending + confirmed + completed }
}
