import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type SchedulerStaffOption = {
  id: string
  first_name: string | null
  surname: string | null
  position: string | null
  department: { label: string } | null
}

export type SchedulerStudentOption = {
  id: string
  first_name: string
  surname: string
  student_code: string | null
}

export type SchedulerStudentApplication = {
  id: string
  entry_year: number | null
  status_id: number | null
  school: { id: string; name: string } | null
}

/**
 * Staff available to be picked as an organiser or attendee. `profiles` has no
 * active flag (checked in 003_create_profiles_table.sql), so every profile is
 * a candidate.
 */
export async function listActiveStaff(): Promise<SchedulerStaffOption[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, surname, position, department:departments!profiles_department_id_fkey(label)')
    .order('surname', { ascending: true })

  if (error) {
    console.error('Error fetching scheduler staff:', error)
    return []
  }
  return (data ?? []) as unknown as SchedulerStaffOption[]
}

/** Quick student lookup for the booking form's attendee/candidate picker. */
export async function searchStudents(q: string, limit = 20): Promise<SchedulerStudentOption[]> {
  const term = q.trim().replace(/[%,()"\\]/g, '')
  if (!term) return []

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('students')
    .select('id, first_name, surname, student_code')
    .or(`surname.ilike.%${term}%,first_name.ilike.%${term}%,student_code.ilike.%${term}%`)
    .order('surname', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('Error searching students for scheduler:', error)
    return []
  }
  return data ?? []
}

/** A student's applications, newest first, for linking a booking to one. */
export async function getStudentApplications(studentId: string): Promise<SchedulerStudentApplication[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('student_applications')
    .select('id, entry_year, status_id, school:schools(id, name)')
    .eq('student_id', studentId)
    .order('entry_year', { ascending: false })

  if (error) {
    console.error('Error fetching student applications for scheduler:', error)
    return []
  }
  return (data ?? []) as unknown as SchedulerStudentApplication[]
}
