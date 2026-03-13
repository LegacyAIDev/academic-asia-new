import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type SchoolAcademicResultWithJoins = {
  id: string
  school_id: string
  exam_year: number | null
  exam_type_id: number | null
  grade_from: string | null
  grade_to: string | null
  result_percentage: string | null
  remarks: string | null
  created_at: string | null
  updated_at: string | null
  exam_type: { id: number; code: string; label: string; country: string } | null
}

/**
 * Fetch all academic results for a school with joined exam type
 */
export async function getSchoolAcademicResults(schoolId: string): Promise<SchoolAcademicResultWithJoins[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('school_academic_results')
    .select(`
      id, school_id, exam_year, exam_type_id, grade_from, grade_to,
      result_percentage, remarks, created_at, updated_at,
      exam_type:academic_exam_types!school_academic_results_exam_type_id_fkey(id, code, label, country)
    `)
    .eq('school_id', schoolId)
    .order('exam_year', { ascending: false, nullsFirst: false })
    .order('exam_type_id', { ascending: true })

  if (error) {
    console.error('Error fetching school academic results:', error)
    return []
  }

  return (data ?? []) as unknown as SchoolAcademicResultWithJoins[]
}

/**
 * Fetch academic exam type dropdown values
 */
export async function getAcademicResultReferenceData() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data } = await supabase
    .from('academic_exam_types')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  return { examTypes: data ?? [] }
}

/**
 * Count academic results for a school (for tab badge)
 */
export async function getSchoolAcademicResultCount(schoolId: string): Promise<number> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { count, error } = await supabase
    .from('school_academic_results')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)

  if (error) {
    console.error('Error fetching academic result count:', error)
    return 0
  }

  return count ?? 0
}
