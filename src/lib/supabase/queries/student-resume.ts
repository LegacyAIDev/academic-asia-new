import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type ResumeWithJoins = {
  id: string
  student_id: string
  resume_type_id: number | null
  exam_school: string | null
  instrument_id: number | null
  subject: string | null
  result: string | null
  qualification: string | null
  piece: string | null
  composer: string | null
  priority: number | null
  gov: string | null
  cat: string | null
  event_name: string | null
  remarks: string | null
  assigned_to: string | null
  created_at: string | null
  updated_at: string | null
  resume_type: { id: number; code: string; label: string } | null
  instrument: { id: number; code: string; label: string; category: string | null } | null
  assigned_profile: { id: string; first_name: string | null; surname: string | null } | null
}

/**
 * Fetch all resume entries for a student, ordered by priority then date
 */
export async function getStudentResume(studentId: string): Promise<ResumeWithJoins[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('student_resume')
    .select(`
      *,
      resume_type:resume_types(id, code, label),
      instrument:music_instruments(id, code, label, category),
      assigned_profile:profiles!student_resume_assigned_to_fkey(id, first_name, surname)
    `)
    .eq('student_id', studentId)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching student resume:', error)
    return []
  }

  return (data ?? []) as unknown as ResumeWithJoins[]
}

/**
 * Fetch reference data for resume form dropdowns
 */
export async function getResumeReferenceData() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const [resumeTypes, instruments] = await Promise.all([
    supabase.from('resume_types').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('music_instruments').select('*').eq('is_active', true).order('sort_order'),
  ])

  return {
    resumeTypes: (resumeTypes.data ?? []) as { id: number; code: string; label: string }[],
    instruments: (instruments.data ?? []) as { id: number; code: string; label: string; category: string | null }[],
  }
}
