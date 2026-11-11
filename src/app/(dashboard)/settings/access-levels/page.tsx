import { getAdminLevels } from "@/lib/supabase/queries/staff"
import {
  getPermissionModules, getAllLevelPermissions, getLevelInheritCounts,
} from "@/lib/supabase/queries/permissions"
import { getCurrentUser } from "@/lib/supabase/auth"
import { canAccess, requireAccess } from "@/lib/permissions/guard"
import { ACCESS, MODULES, shownModules } from "@/lib/permissions/modules"
import { AccessLevelsEditor } from "./access-levels-editor"

export default async function AccessLevelsPage() {
  await requireAccess(MODULES.SETTINGS)

  const [adminLevels, modules, levelDefaults, inheritCounts, currentUser, canWrite] = await Promise.all([
    getAdminLevels(),
    getPermissionModules(),
    getAllLevelPermissions(),
    getLevelInheritCounts(),
    getCurrentUser(),
    canAccess(MODULES.SETTINGS, ACCESS.WRITE),
  ])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Access levels: what each level can open. Everyone on a level gets this, unless it is changed on their own staff page.
        </p>
      </div>

      <AccessLevelsEditor
        adminLevels={adminLevels}
        modules={shownModules(modules)}
        levelDefaults={levelDefaults}
        inheritCounts={inheritCounts}
        callerLevel={currentUser?.admin_level ?? null}
        canWrite={canWrite}
      />
    </div>
  )
}
