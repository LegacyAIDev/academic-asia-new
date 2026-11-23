import { cache } from 'react'
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

/**
 * The signed-in user, checked once per request: the layout, the permission
 * check and the page all need it.
 *
 * getClaims verifies the session token's signature; with the project's
 * asymmetric signing keys that happens here, without a call to the Auth server
 * (it falls back to one on projects still on the shared secret). Actions that
 * guard against something sensitive, such as resetting a colleague's password,
 * still ask the Auth server with getUser.
 */
export const getAuthUser = cache(async (): Promise<{ id: string; email: string | null } | null> => {
  const supabase = createClient(await cookies())
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims?.sub) return null
  return { id: data.claims.sub, email: typeof data.claims.email === 'string' ? data.claims.email : null }
})

/** Get the current authenticated user with profile data (once per request). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const user = await getAuthUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, surname, admin_level, department:departments!profiles_department_id_fkey(label)')
    .eq('id', user.id)
    .single()

  return {
    id: user.id,
    email: user.email,
    first_name: profile?.first_name ?? null,
    surname: profile?.surname ?? null,
    department_label: (profile?.department as unknown as { label: string } | null)?.label ?? null,
    admin_level: profile?.admin_level ?? null,
  }
})
