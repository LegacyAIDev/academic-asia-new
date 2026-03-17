import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type ApplicationWithJoins = {
  id: string
  student_id: string
  school_id: string
  entry_year: number | null
  entry_month: number | null
  course_start_month: number | null
  course_start_year: number | null
  is_referral: boolean | null
  scholarship_detail: string | null
  scholarship_types: string[] | null
  event_id: string | null
  event_date: string | null
  event_time: string | null
  music_audition: string | null
  aa_remarks: string | null
  result_remarks: string | null
  remarks_to_school: string | null
  registration_date: string | null
  visit_date: string | null
  visit_time: string | null
  school_contact: string | null
  visit_remarks: string | null
  is_archived: boolean | null
  mode_id: number | null
  status_id: number | null
  created_at: string | null
  updated_at: string | null
  school: { id: string; name: string } | null
  status: { id: number; code: string; label: string; category: string | null } | null
  mode: { id: number; code: string; label: string } | null
  event: { id: string; name: string } | null
}

/**
 * Fetch all school applications for a student with joined reference data
 */
export async function getStudentApplications(studentId: string): Promise<ApplicationWithJoins[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('student_applications')
    .select(`
      *,
      school:schools!student_applications_school_id_fkey(id, name),
      status:application_statuses!student_applications_status_id_fkey(id, code, label, category),
      mode:application_modes!student_applications_mode_id_fkey(id, code, label),
      event:events!student_applications_event_id_fkey(id, name)
    `)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching student applications:', error)
    return []
  }

  return (data ?? []) as unknown as ApplicationWithJoins[]
}

/**
 * Fetch reference data needed for the application form
 */
export async function getApplicationReferenceData() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const [statuses, modes, schools, events] = await Promise.all([
    supabase.from('application_statuses').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('application_modes').select('*').order('sort_order'),
    supabase.from('schools').select('id, name').order('name'),
    supabase.from('events').select('id, name').order('name'),
  ])

  return {
    statuses: statuses.data ?? [],
    modes: modes.data ?? [],
    schools: schools.data ?? [],
    events: events.data ?? [],
  }
}
