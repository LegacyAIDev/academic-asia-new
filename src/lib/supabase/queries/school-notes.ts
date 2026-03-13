import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type SchoolNoteWithJoins = {
  id: string
  school_id: string
  category_id: number | null
  detail: string | null
  created_at: string | null
  updated_at: string | null
  category: { id: number; code: string; label: string } | null
}

/**
 * Fetch all notes for a school with joined category
 */
export async function getSchoolNotes(schoolId: string): Promise<SchoolNoteWithJoins[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('school_notes')
    .select(`
      id, school_id, category_id, detail,
      created_at, updated_at,
      category:school_note_categories!school_notes_category_id_fkey(id, code, label)
    `)
    .eq('school_id', schoolId)
    .order('category_id', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching school notes:', error)
    return []
  }

  return (data ?? []) as unknown as SchoolNoteWithJoins[]
}

/**
 * Fetch note category dropdown values
 */
export async function getNoteReferenceData() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data } = await supabase
    .from('school_note_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  return { categories: data ?? [] }
}

/**
 * Count notes for a school (for tab badge)
 */
export async function getSchoolNoteCount(schoolId: string): Promise<number> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { count, error } = await supabase
    .from('school_notes')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)

  if (error) {
    console.error('Error fetching note count:', error)
    return 0
  }

  return count ?? 0
}
