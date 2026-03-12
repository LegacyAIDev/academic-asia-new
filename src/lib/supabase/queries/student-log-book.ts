import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type LogBookWithJoins = {
  id: string
  student_id: string
  remarks: string | null
  assigned_to: string | null
  created_at: string | null
  updated_at: string | null
  assigned_profile: { id: string; full_name: string | null } | null
}

/**
 * Fetch all log book entries for a student, newest first
 */
export async function getStudentLogBook(studentId: string): Promise<LogBookWithJoins[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('student_log_book')
    .select(`
      *,
      assigned_profile:profiles!student_log_book_assigned_to_fkey(id, full_name)
    `)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching student log book:', error)
    return []
  }

  return (data ?? []) as unknown as LogBookWithJoins[]
}
