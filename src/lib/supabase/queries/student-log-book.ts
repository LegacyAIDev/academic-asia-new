import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export type StudentLegacyLogMeta = { id: string; legacy_last_update: string | null }

/**
 * Whether the student has an imported log book, without its text. Entries run
 * to half a megabyte, so the text is fetched only when someone opens it.
 */
export async function getStudentLegacyLogMeta(studentId: string): Promise<StudentLegacyLogMeta | null> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('student_log_book')
    .select('id, legacy_last_update')
    .eq('student_id', studentId)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error fetching student log book:', error)
    return null
  }
  return data
}
