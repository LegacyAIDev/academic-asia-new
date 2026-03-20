import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type IntroSentRecord = {
  id: string
  school_id: string
  sent_at: string | null
  method: string | null
  sent_by_profile: { id: string; full_name: string | null } | null
  school: { id: string; name: string } | null
}

export type BriefIntroWithJoins = {
  id: string
  student_id: string
  spoken_english_id: number | null
  legacy_spoken_english: string | null
  hobbies: string | null
  subjects: string | null
  remarks: string | null
  is_approved: boolean | null
  approved_at: string | null
  approved_by: string | null
  assigned_to: string | null
  created_at: string | null
  updated_at: string | null
  spoken_english: { id: number; code: string; label: string } | null
  assigned_profile: { id: string; full_name: string | null } | null
  approved_profile: { id: string; full_name: string | null } | null
  sent_history: IntroSentRecord[]
}

/**
 * Fetch student brief intro - single record per student
 */
export async function getStudentBriefIntro(studentId: string): Promise<BriefIntroWithJoins | null> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('student_brief_intro')
    .select(`
      *,
      spoken_english:spoken_english_levels(id, code, label),
      assigned_profile:profiles!student_brief_intro_assigned_to_fkey(id, full_name),
      approved_profile:profiles!student_brief_intro_approved_by_fkey(id, full_name),
      sent_history:student_intro_sent_history(
        id, school_id, sent_at, method,
        sent_by_profile:profiles(id, full_name),
        school:schools(id, name)
      )
    `)
    .eq('student_id', studentId)
    .maybeSingle()

  if (error) {
    console.error('Error fetching student brief intro:', error)
    return null
  }

  return data as unknown as BriefIntroWithJoins | null
}

/**
 * Fetch spoken english levels for the brief intro form dropdown
 */
export async function getBriefIntroReferenceData() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data } = await supabase
    .from('spoken_english_levels')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  return {
    spokenEnglishLevels: (data ?? []) as { id: number; code: string; label: string }[],
  }
}
