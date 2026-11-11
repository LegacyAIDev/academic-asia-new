'use server'

import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES, shownModules } from '@/lib/permissions/modules'
import { ADMIN_LEVELS, hasMinLevel } from '@/lib/auth-utils'
import { getCurrentUser } from '@/lib/supabase/auth'
import { getAdminLevels, getDepartments, getStaffById } from '@/lib/supabase/queries/staff'
import { getAllLevelPermissions, getPermissionModules, getProfileOverrides } from '@/lib/supabase/queries/permissions'

/**
 * What the staff drawer needs, loaded when it opens: the choices, the access
 * defaults per level and, when editing, the person and their own access changes.
 */
export async function loadStaffForm(staffId?: string) {
  const denied = await assertAccess(MODULES.STAFF, ACCESS.WRITE)
  if (denied) return denied
  const [staff, departments, adminLevels, modules, levelDefaults, overrides, currentUser] = await Promise.all([
    staffId ? getStaffById(staffId) : Promise.resolve(null),
    getDepartments(),
    getAdminLevels(),
    getPermissionModules(),
    getAllLevelPermissions(),
    staffId ? getProfileOverrides(staffId) : Promise.resolve({}),
    getCurrentUser(),
  ])
  if (staffId && !staff) return { success: false as const, error: 'This staff member no longer exists.' }
  // Changing someone's access needs seniority on top of staff edit rights, or anyone could promote themselves.
  const canManageAccess = hasMinLevel(currentUser?.admin_level ?? null, ADMIN_LEVELS.MANAGER)
  return { success: true as const, data: { staff, departments, adminLevels, modules: shownModules(modules), levelDefaults, overrides, canManageAccess } }
}
