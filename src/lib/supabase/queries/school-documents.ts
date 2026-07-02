import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type SchoolDocumentRecord = {
  id: string
  school_id: string
  category_id: number
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  title: string | null
  category: { id: number; code: string; label: string } | null
}

/** All documents for a school, newest first. */
export async function getSchoolDocuments(schoolId: string): Promise<SchoolDocumentRecord[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('school_documents')
    .select('*, category:document_categories(id, code, label)')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching school documents:', error)
    return []
  }
  return (data ?? []) as unknown as SchoolDocumentRecord[]
}
