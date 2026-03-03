import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type EducationWithJoins = {
  id: string
  student_id: string
  course_id: number | null
  legacy_course_name: string | null
  tutor: string | null
  start_date: string | null
  end_date: string | null
  total_hours: string | null
  status_id: number | null
  email_sent: boolean | null
  remarks: string | null
  created_at: string | null
  updated_at: string | null
  course: { id: number; code: string; label: string; category: string | null } | null
  status: { id: number; code: string; label: string } | null
}

/**
 * Fetch all education entries for a student with joined course and status
 */
export async function getStudentEducation(studentId: string): Promise<EducationWithJoins[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('student_education')
    .select(`
      *,
      course:education_courses!student_education_course_id_fkey(id, code, label, category),
      status:education_statuses!student_education_status_id_fkey(id, code, label)
    `)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching student education:', error)
    return []
  }

  return (data ?? []) as unknown as EducationWithJoins[]
}

/**
 * Fetch reference data for the education form dropdowns
 */
export async function getEducationReferenceData() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const [courses, statuses] = await Promise.all([
    supabase.from('education_courses').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('education_statuses').select('*').order('sort_order'),
  ])

  return {
    courses: courses.data ?? [],
    statuses: statuses.data ?? [],
  }
}
