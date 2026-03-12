import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type SchoolVisitWithJoins = {
  id: string
  school_id: string
  visit_date: string | null
  school_contact: string | null
  visit_log: string | null
  result: string | null
  remarks: string | null
  created_at: string | null
  updated_at: string | null
}

/** Fetch all visits for a school */
export async function getSchoolVisits(schoolId: string): Promise<SchoolVisitWithJoins[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('school_visits')
    .select(`
      id, school_id, visit_date, school_contact, visit_log,
      result, remarks, created_at, updated_at
    `)
    .eq('school_id', schoolId)
    .order('visit_date', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('Error fetching school visits:', error)
    return []
  }

  return (data ?? []) as SchoolVisitWithJoins[]
}

/** Count visits for a school */
export async function getSchoolVisitCount(schoolId: string): Promise<number> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { count, error } = await supabase
    .from('school_visits')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)

  if (error) {
    console.error('Error fetching school visit count:', error)
    return 0
  }

  return count ?? 0
}
