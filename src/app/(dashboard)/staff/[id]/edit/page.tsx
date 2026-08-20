import { notFound } from "next/navigation"
import { getStaffById, getDepartments, getAdminLevels } from "@/lib/supabase/queries/staff"
import {
  getPermissionModules, getAllLevelPermissions, getProfileOverrides,
} from "@/lib/supabase/queries/permissions"
import { getCurrentUser } from "@/lib/supabase/auth"
import { StaffForm } from "../../staff-form"
import { requireAccess } from "@/lib/permissions/guard"
import { ACCESS, MODULES } from "@/lib/permissions/modules"
import { ADMIN_LEVELS, hasMinLevel } from "@/lib/auth-utils"

type EditStaffPageParams = {
  params: Promise<{ id: string }>
}

export default async function EditStaffPage({ params }: EditStaffPageParams) {
  await requireAccess(MODULES.STAFF, ACCESS.WRITE)

  const { id } = await params

  const [staff, departments, adminLevels, modules, levelDefaults, overrides, currentUser] =
    await Promise.all([
      getStaffById(id),
      getDepartments(),
      getAdminLevels(),
      getPermissionModules(),
      getAllLevelPermissions(),
      getProfileOverrides(id),
      getCurrentUser(),
    ])

  if (!staff) notFound()

  // Editing someone's access needs seniority on top of staff:WRITE — otherwise
  // anyone who can edit staff could promote themselves.
  const canManageAccess = hasMinLevel(currentUser?.admin_level ?? null, ADMIN_LEVELS.MANAGER)

  return (
    <StaffForm
      mode="edit"
      staff={staff}
      departments={departments}
      adminLevels={adminLevels}
      modules={modules}
      levelDefaults={levelDefaults}
      initialOverrides={overrides}
      canManageAccess={canManageAccess}
    />
  )
}
