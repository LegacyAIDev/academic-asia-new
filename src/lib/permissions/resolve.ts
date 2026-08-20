import { cache } from 'react'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import {
  ACCESS,
  denyAll,
  toAccessLevel,
  type AccessLevel,
  type ModuleKey,
  type PermissionMap,
} from './modules'

/**
 * Next signals control flow by throwing — dynamic-rendering bailouts, redirects,
 * notFound(). Those must propagate; swallowing them into a denyAll() would both
 * break the framework's rendering decisions and bury the reason in the logs.
 */
function isFrameworkControlFlow(err: unknown): boolean {
  const digest = (err as { digest?: unknown })?.digest
  return typeof digest === 'string' &&
    (digest === 'DYNAMIC_SERVER_USAGE' ||
      digest.startsWith('NEXT_REDIRECT') ||
      digest === 'NEXT_NOT_FOUND' ||
      digest === 'NEXT_HTTP_ERROR_FALLBACK;404')
}

/**
 * Effective module permissions for the signed-in user.
 *
 * Resolved from the database on every request rather than read off a JWT claim:
 * claims only change when the token refreshes (up to an hour), so revoking
 * someone's access would not take effect until then. React `cache()` collapses
 * repeat calls within one request to a single round-trip, so the cost matches
 * the profile lookup `getCurrentUser()` already does.
 *
 * Fails closed — a signed-out user or any error yields an all-NONE map.
 */
export const getPermissions = cache(async (): Promise<PermissionMap> => {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return denyAll()

    const { data, error } = await supabase.rpc('resolve_permissions', {
      p_profile_id: user.id,
    })

    if (error) {
      console.error('Error resolving permissions:', error)
      return denyAll()
    }

    // Start from denyAll so a module missing from the response stays closed
    const map = denyAll()
    for (const row of data ?? []) {
      if (row.module_key in map) {
        map[row.module_key as ModuleKey] = toAccessLevel(row.access)
      }
    }
    return map
  } catch (err) {
    if (isFrameworkControlFlow(err)) throw err
    console.error('Error in getPermissions:', err)
    return denyAll()
  }
})

/** Effective access for a single module. */
export async function getModuleAccess(module: ModuleKey): Promise<AccessLevel> {
  const permissions = await getPermissions()
  return permissions[module] ?? ACCESS.NONE
}
