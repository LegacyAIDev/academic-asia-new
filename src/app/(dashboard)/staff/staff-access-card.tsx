"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Shield } from "lucide-react"
import { PermissionMatrix, type MatrixModule } from "@/components/permissions/permission-matrix"
import { ACCESS, type AccessLevel } from "@/lib/permissions/modules"

type StaffAccessCardProps = {
  departments: { id: number; label: string }[]
  adminLevels: { id: number; label: string }[]
  modules: MatrixModule[]
  /** Level defaults keyed level -> module id, so inherited rows update client-side. */
  levelDefaults: Record<number, Record<number, AccessLevel>>
  defaultDepartmentId?: number | null
  adminLevel: number | null
  onAdminLevelChange: (level: number | null) => void
  /** Explicit deviations from the level default, keyed by module id. */
  overrides: Record<number, AccessLevel>
  onOverrideChange: (moduleId: number, access: AccessLevel) => void
  onOverrideReset: (moduleId: number) => void
  /** False when the signed-in user may not change another person's access. */
  canManageAccess: boolean
}

const SUPER_ADMIN_LEVEL = 0

/** Department, access level, and the per-module access-rights grid. */
export function StaffAccessCard({
  departments,
  adminLevels,
  modules,
  levelDefaults,
  defaultDepartmentId,
  adminLevel,
  onAdminLevelChange,
  overrides,
  onOverrideChange,
  onOverrideReset,
  canManageAccess,
}: StaffAccessCardProps) {
  const isSuperAdmin = adminLevel === SUPER_ADMIN_LEVEL
  const inherited = adminLevel === null ? {} : (levelDefaults[adminLevel] ?? {})

  // Super Admin resolves to full write in the database regardless of stored
  // rows, so show that rather than letting someone edit a value with no effect.
  const effective: Record<number, AccessLevel> = isSuperAdmin
    ? Object.fromEntries(modules.map(m => [m.id, ACCESS.WRITE]))
    : { ...inherited, ...overrides }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Shield className="h-4 w-4 text-muted-foreground" />
          Role &amp; Access Level
        </CardTitle>
        <CardDescription>Department, access level and per-module rights</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Department</Label>
            <Select name="department_id" defaultValue={defaultDepartmentId?.toString() ?? ""}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map(d => (
                  <SelectItem key={d.id} value={d.id.toString()}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Access Level</Label>
            {/* Controlled: the value is submitted from form state, not FormData. */}
            <Select
              value={adminLevel === null ? "" : adminLevel.toString()}
              onValueChange={v => onAdminLevelChange(v === "" ? null : Number(v))}
              disabled={!canManageAccess}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select access level" />
              </SelectTrigger>
              <SelectContent>
                {adminLevels.map(l => (
                  <SelectItem key={l.id} value={l.id.toString()}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <Label>Access Rights</Label>
            <p className="text-xs text-muted-foreground mt-1">
              {isSuperAdmin
                ? "Super Admin always has full access to every module."
                : "Defaults come from the access level. Change any row to override it for this person."}
            </p>
          </div>
          <PermissionMatrix
            modules={modules}
            value={effective}
            inherited={isSuperAdmin ? undefined : inherited}
            onChange={onOverrideChange}
            onReset={onOverrideReset}
            disabled={!canManageAccess || isSuperAdmin}
          />
        </div>
      </CardContent>
    </Card>
  )
}
