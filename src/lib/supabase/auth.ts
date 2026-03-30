import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export type CurrentUser = {
  id: string
  email: string | null
  first_name: string | null
  surname: string | null
  department_label: string | null
  admin_level: number | null
}

/** Get the current authenticated user with profile data */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, surname, admin_level, department:departments!profiles_department_id_fkey(label)')
    .eq('id', user.id)
    .single()

  return {
    id: user.id,
    email: user.email ?? null,
    first_name: profile?.first_name ?? null,
    surname: profile?.surname ?? null,
    department_label: (profile?.department as unknown as { label: string } | null)?.label ?? null,
    admin_level: profile?.admin_level ?? null,
  }
}
