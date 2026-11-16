import type { SupabaseClient } from '@supabase/supabase-js'

/** The next student code after the highest in use: S000123 → S000124. */
export async function nextStudentCode(supabase: SupabaseClient): Promise<string> {
  const { data } = await supabase
    .from('students')
    .select('student_code')
    .like('student_code', 'S%')
    .order('student_code', { ascending: false })
    .limit(1)
  const latest = (data as { student_code: string | null }[] | null)?.[0]?.student_code
  if (!latest) return 'S000001'
  const num = parseInt(latest.replace('S', ''), 10)
  return `S${String(num + 1).padStart(6, '0')}`
}
