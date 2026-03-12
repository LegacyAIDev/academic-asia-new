import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type SchoolContactWithJoins = {
  id: string
  school_id: string
  position: string | null
  surname: string | null
  first_name: string | null
  title: string | null
  gender: string | null
  telephone: string | null
  mobile: string | null
  fax: string | null
  email_1: string | null
  email_2: string | null
  email_3: string | null
  address_1: string | null
  address_2: string | null
  priority: number | null
  responsible: string | null
  remarks: string | null
  created_at: string | null
  updated_at: string | null
}

/** Fetch all contacts for a school */
export async function getSchoolContacts(schoolId: string): Promise<SchoolContactWithJoins[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('school_contacts')
    .select(`
      id, school_id, position, surname, first_name, title, gender,
      telephone, mobile, fax, email_1, email_2, email_3,
      address_1, address_2, priority, responsible, remarks,
      created_at, updated_at
    `)
    .eq('school_id', schoolId)
    .order('priority', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching school contacts:', error)
    return []
  }

  return (data ?? []) as SchoolContactWithJoins[]
}

/** Count contacts for a school */
export async function getSchoolContactCount(schoolId: string): Promise<number> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { count, error } = await supabase
    .from('school_contacts')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)

  if (error) {
    console.error('Error fetching school contact count:', error)
    return 0
  }

  return count ?? 0
}
