import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type ExamResultWithJoins = {
  id: string
  student_id: string
  school_id: string | null
  test_date: string | null
  exam_type_id: number | null
  subject_id: number | null
  paper_id: number | null
  paper_ready: boolean | null
  score: number | null
  max_score: number | null
  status_id: number | null
  remarks: string | null
  legacy_exam: string | null
  legacy_course: string | null
  created_at: string | null
  updated_at: string | null
  school: { id: string; name: string } | null
  exam_type: { id: number; code: string; label: string } | null
  subject: { id: number; code: string; label: string; exam_type_code: string | null } | null
  paper: { id: number; code: string; label: string } | null
  status: { id: number; code: string; label: string } | null
}

/**
 * Fetch all exam results for a student with joined reference data
 */
export async function getStudentExamResults(studentId: string): Promise<ExamResultWithJoins[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('student_exam_results')
    .select(`
      *,
      school:schools!student_exam_results_school_id_fkey(id, name),
      exam_type:exam_types!student_exam_results_exam_type_id_fkey(id, code, label),
      subject:exam_subjects!student_exam_results_subject_id_fkey(id, code, label, exam_type_code),
      paper:exam_papers!student_exam_results_paper_id_fkey(id, code, label),
      status:exam_result_statuses!student_exam_results_status_id_fkey(id, code, label)
    `)
    .eq('student_id', studentId)
    .order('test_date', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('Error fetching student exam results:', error)
    return []
  }

  return (data ?? []) as unknown as ExamResultWithJoins[]
}

/**
 * Fetch reference data for the exam result form dropdowns
 */
export async function getExamResultReferenceData() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const [examTypes, subjects, papers, statuses] = await Promise.all([
    supabase.from('exam_types').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('exam_subjects').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('exam_papers').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('exam_result_statuses').select('*').order('sort_order'),
  ])

  return {
    examTypes: examTypes.data ?? [],
    subjects: subjects.data ?? [],
    papers: papers.data ?? [],
    statuses: statuses.data ?? [],
  }
}
