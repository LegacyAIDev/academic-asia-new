import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { getAdminLevels } from "@/lib/supabase/queries/staff"
import {
  getPermissionModules, getAllLevelPermissions, getLevelInheritCounts,
} from "@/lib/supabase/queries/permissions"
import { getCurrentUser } from "@/lib/supabase/auth"
import { requireAccess } from "@/lib/permissions/guard"
import { ACCESS, MODULES } from "@/lib/permissions/modules"
import { AccessLevelsEditor } from "./access-levels-editor"

export default async function AccessLevelsPage() {
  await requireAccess(MODULES.SETTINGS, ACCESS.WRITE)

  const [adminLevels, modules, levelDefaults, inheritCounts, currentUser] = await Promise.all([
    getAdminLevels(),
    getPermissionModules(),
    getAllLevelPermissions(),
    getLevelInheritCounts(),
    getCurrentUser(),
  ])

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/settings">Settings</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Access Levels</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Access Levels</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Defaults every staff member on a level inherits, unless overridden on their profile.
        </p>
      </div>

      <AccessLevelsEditor
        adminLevels={adminLevels}
        modules={modules}
        levelDefaults={levelDefaults}
        inheritCounts={inheritCounts}
        callerLevel={currentUser?.admin_level ?? null}
      />
    </div>
  )
}
