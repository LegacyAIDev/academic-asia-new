import { getDepartments, getAdminLevels } from "@/lib/supabase/queries/staff"
import { getPermissionModules, getAllLevelPermissions } from "@/lib/supabase/queries/permissions"
import { getCurrentUser } from "@/lib/supabase/auth"
import { StaffForm } from "../staff-form"
import { requireAccess } from "@/lib/permissions/guard"
import { ACCESS, MODULES } from "@/lib/permissions/modules"
import { ADMIN_LEVELS, hasMinLevel } from "@/lib/auth-utils"

export default async function NewStaffPage() {
  await requireAccess(MODULES.STAFF, ACCESS.WRITE)

  const [departments, adminLevels, modules, levelDefaults, currentUser] = await Promise.all([
    getDepartments(),
    getAdminLevels(),
    getPermissionModules(),
    getAllLevelPermissions(),
    getCurrentUser(),
  ])

  // Editing someone's access needs seniority on top of staff:WRITE — otherwise
  // anyone who can edit staff could promote themselves.
  const canManageAccess = hasMinLevel(currentUser?.admin_level ?? null, ADMIN_LEVELS.MANAGER)

  return (
    <StaffForm
      mode="create"
      departments={departments}
      adminLevels={adminLevels}
      modules={modules}
      levelDefaults={levelDefaults}
      canManageAccess={canManageAccess}
    />
  )
}
