import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type SchoolEntranceExamWithJoins = {
  id: string
  school_id: string
  entry_year: string | null
  exam_type_id: number | null
  year_level: string | null
  subject: string | null
  duration_minutes: number | null
  exam_format: string | null
  files: string | null
  has_paper: boolean | null
  remarks: string | null
  aa_remarks: string | null
  created_at: string | null
  updated_at: string | null
  exam_type: { id: number; code: string; label: string } | null
}

/**
 * Fetch all entrance exams for a school with joined exam type
 */
export async function getSchoolEntranceExams(schoolId: string): Promise<SchoolEntranceExamWithJoins[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('school_entrance_exams')
    .select(`
      id, school_id, entry_year, exam_type_id, year_level, subject,
      duration_minutes, exam_format, files, has_paper, remarks, aa_remarks,
      created_at, updated_at,
      exam_type:entrance_exam_types!school_entrance_exams_exam_type_id_fkey(id, code, label)
    `)
    .eq('school_id', schoolId)
    .order('entry_year', { ascending: false, nullsFirst: false })
    .order('year_level', { ascending: true })
    .order('subject', { ascending: true })

  if (error) {
    console.error('Error fetching school entrance exams:', error)
    return []
  }

  return (data ?? []) as unknown as SchoolEntranceExamWithJoins[]
}

/**
 * Fetch entrance exam type dropdown values
 */
export async function getEntranceExamReferenceData() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data } = await supabase
    .from('entrance_exam_types')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  return { examTypes: data ?? [] }
}

/**
 * Count entrance exams for a school (for tab badge)
 */
export async function getSchoolEntranceExamCount(schoolId: string): Promise<number> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { count, error } = await supabase
    .from('school_entrance_exams')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)

  if (error) {
    console.error('Error fetching entrance exam count:', error)
    return 0
  }

  return count ?? 0
}
