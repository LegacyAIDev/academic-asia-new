import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type InternalNotesRecord = {
  id: string
  student_id: string
  character: string | null
  strategy: string | null
  parent_expectations: string | null
  disability_sen: string | null
  medical_notes: string | null
  guardianship_notes: string | null
  additional_remarks: string | null
  assigned_to: string | null
  created_at: string | null
  updated_at: string | null
  assigned_profile: { id: string; first_name: string | null; surname: string | null } | null
}

/** Fetch internal notes for a student — single record per student */
export async function getStudentInternalNotes(studentId: string): Promise<InternalNotesRecord | null> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('student_internal_notes')
    .select(`
      *,
      assigned_profile:profiles!student_internal_notes_assigned_to_fkey(id, first_name, surname)
    `)
    .eq('student_id', studentId)
    .maybeSingle()

  if (error) {
    console.error('Error fetching student internal notes:', error)
    return null
  }

  return data as unknown as InternalNotesRecord | null
}
