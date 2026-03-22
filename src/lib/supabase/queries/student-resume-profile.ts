import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type ResumeProfileRecord = {
  id: string
  student_id: string
  english_standard: 'fluent' | 'good' | 'not_good' | null
  interests_hobbies: string | null
  parents_input: string | null
  assigned_to: string | null
  created_at: string | null
  updated_at: string | null
}

export type ResumeTalentRecord = {
  id: string
  student_id: string
  category: 'music' | 'sports' | 'academic' | 'art' | 'others'
  instrument_sport: string | null
  award_name: string | null
  results: string | null
  video_path: string | null
  video_file_name: string | null
  created_at: string | null
  updated_at: string | null
}

export type StudentDocumentRecord = {
  id: string
  student_id: string
  category_id: number
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  title: string | null
  description: string | null
  academic_year: string | null
  created_at: string | null
  updated_at: string | null
  category: { id: number; code: string; label: string } | null
}

/** Fetch single resume profile for a student */
export async function getStudentResumeProfile(studentId: string): Promise<ResumeProfileRecord | null> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('student_resume_profile')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle()

  if (error) {
    console.error('Error fetching resume profile:', error)
    return null
  }
  return data as ResumeProfileRecord | null
}

/** Fetch special talents for a student */
export async function getStudentResumeTalents(studentId: string): Promise<ResumeTalentRecord[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('student_resume_talents')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching resume talents:', error)
    return []
  }
  return (data ?? []) as ResumeTalentRecord[]
}

/** Fetch documents for a student filtered by section (resume, legal_documents, etc.) */
export async function getStudentDocuments(studentId: string, section?: string): Promise<StudentDocumentRecord[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  let query = supabase
    .from('student_documents')
    .select('*, category:document_categories(id, code, label)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  if (section) {
    const { data: cats } = await supabase
      .from('document_categories')
      .select('id')
      .eq('section', section)
    if (cats && cats.length > 0) {
      query = query.in('category_id', cats.map(c => c.id))
    }
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching student documents:', error)
    return []
  }
  return (data ?? []) as unknown as StudentDocumentRecord[]
}
