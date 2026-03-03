import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type VisaWithJoins = {
  id: string
  student_id: string
  school_id: string | null
  application: string | null
  entry_year: string | null
  entry_month: number | null
  entry_year_value: number | null
  status_id: number | null
  request_sent_to_parent: boolean | null
  passport_received: boolean | null
  passport_sent_to_school: boolean | null
  sent_visa_information: boolean | null
  cas_received: boolean | null
  visa_granted: boolean | null
  visa_copy: boolean | null
  visa_copy_sent: boolean | null
  appointment: boolean | null
  appointment_date: string | null
  remarks: string | null
  created_at: string | null
  updated_at: string | null
  school: { id: string; name: string } | null
  status: { id: number; code: string; label: string } | null
}

/**
 * Fetch all visa entries for a student with joined school and status
 */
export async function getStudentVisas(studentId: string): Promise<VisaWithJoins[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('student_visas')
    .select(`
      *,
      school:schools!student_visas_school_id_fkey(id, name),
      status:visa_statuses!student_visas_status_id_fkey(id, code, label)
    `)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching student visas:', error)
    return []
  }

  return (data ?? []) as unknown as VisaWithJoins[]
}

/**
 * Fetch reference data for the visa form.
 * Schools are scoped to the student's existing school applications.
 */
export async function getVisaReferenceData(studentId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const [statuses, applicationSchools] = await Promise.all([
    supabase.from('visa_statuses').select('*').order('sort_order'),
    supabase
      .from('student_applications')
      .select('school:schools!student_applications_school_id_fkey(id, name)')
      .eq('student_id', studentId),
  ])

  // Deduplicate schools from applications
  const schoolMap = new Map<string, { id: string; name: string }>()
  for (const row of applicationSchools.data ?? []) {
    const school = row.school as unknown as { id: string; name: string } | null
    if (school?.id) {
      schoolMap.set(school.id, school)
    }
  }
  const schools = Array.from(schoolMap.values()).sort((a, b) => a.name.localeCompare(b.name))

  return {
    statuses: statuses.data ?? [],
    schools,
  }
}
