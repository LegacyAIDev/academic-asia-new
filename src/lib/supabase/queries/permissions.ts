import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { toAccessLevel, type AccessLevel } from '@/lib/permissions/modules'

export type PermissionModule = {
  id: number
  key: string
  label: string
  sort_order: number
}

/** All modules, in display order. */
export async function getPermissionModules(): Promise<PermissionModule[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('permission_modules')
    .select('id, key, label, sort_order')
    .order('sort_order')

  if (error) {
    console.error('Error fetching permission modules:', error)
    return []
  }

  return (data ?? []).map(m => ({ ...m, sort_order: m.sort_order ?? 0 }))
}

/** Default access map for one admin level, keyed by module id. */
export async function getLevelPermissions(
  adminLevel: number,
): Promise<Record<number, AccessLevel>> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('admin_level_permissions')
    .select('module_id, access')
    .eq('admin_level', adminLevel)

  if (error) {
    console.error('Error fetching level permissions:', error)
    return {}
  }

  return Object.fromEntries(
    (data ?? []).map(r => [r.module_id, toAccessLevel(r.access)]),
  )
}

/** How many staff sit on an admin level — shown before editing its defaults. */
export async function getLevelInheritCounts(): Promise<Record<number, number>> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase.from('profiles').select('admin_level')

  if (error) {
    console.error('Error counting level members:', error)
    return {}
  }

  const counts: Record<number, number> = {}
  for (const row of data ?? []) {
    if (row.admin_level !== null) {
      counts[row.admin_level] = (counts[row.admin_level] ?? 0) + 1
    }
  }
  return counts
}

/**
 * Default access for every admin level, keyed level -> module id.
 *
 * Fetched in one go so the staff form can re-render inherited rows when the
 * access-level dropdown changes, without a server round-trip per change.
 */
export async function getAllLevelPermissions(): Promise<
  Record<number, Record<number, AccessLevel>>
> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('admin_level_permissions')
    .select('admin_level, module_id, access')

  if (error) {
    console.error('Error fetching all level permissions:', error)
    return {}
  }

  const byLevel: Record<number, Record<number, AccessLevel>> = {}
  for (const row of data ?? []) {
    byLevel[row.admin_level] ??= {}
    byLevel[row.admin_level][row.module_id] = toAccessLevel(row.access)
  }
  return byLevel
}

/** A staff member's explicit deviations, keyed by module id. */
export async function getProfileOverrides(
  profileId: string,
): Promise<Record<number, AccessLevel>> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('profile_permission_overrides')
    .select('module_id, access')
    .eq('profile_id', profileId)

  if (error) {
    console.error('Error fetching profile overrides:', error)
    return {}
  }

  return Object.fromEntries(
    (data ?? []).map(r => [r.module_id, toAccessLevel(r.access)]),
  )
}
