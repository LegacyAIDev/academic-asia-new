"use client"

import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { PermissionMatrix, type MatrixModule } from "@/components/permissions/permission-matrix"
import { ACCESS, type AccessLevel } from "@/lib/permissions/modules"

type StaffAccessSectionProps = {
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

/** Access level (required, first), department, and the per-area rights under "Advanced". */
export function StaffAccessSection({
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
}: StaffAccessSectionProps) {
  const isSuperAdmin = adminLevel === SUPER_ADMIN_LEVEL
  const inherited = adminLevel === null ? {} : (levelDefaults[adminLevel] ?? {})

  // Super Admin resolves to full write in the database regardless of stored
  // rows, so show that rather than letting someone edit a value with no effect.
  const effective: Record<number, AccessLevel> = isSuperAdmin
    ? Object.fromEntries(modules.map(m => [m.id, ACCESS.WRITE]))
    : { ...inherited, ...overrides }

  const levelChosen = adminLevel !== null

  return (
    <div className="space-y-4">
      <div className="grid gap-4 @md:grid-cols-2 [&>*]:min-w-0">
        <div className="space-y-2">
          <Label htmlFor="staff-access-level">Access level <span className="text-destructive">*</span></Label>
          {/* Controlled: the value is submitted from form state, not FormData. */}
          <Select
            value={adminLevel === null ? "" : adminLevel.toString()}
            onValueChange={v => onAdminLevelChange(v === "" ? null : Number(v))}
            disabled={!canManageAccess}
          >
            <SelectTrigger id="staff-access-level" className="w-full bg-background">
              <SelectValue placeholder="Choose what they can open" />
            </SelectTrigger>
            <SelectContent>
              {adminLevels.map(l => (
                <SelectItem key={l.id} value={l.id.toString()}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!canManageAccess && <p className="text-xs text-muted-foreground">Only a manager or above can change access.</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="staff-department">Department</Label>
          <Select name="department_id" defaultValue={defaultDepartmentId?.toString() ?? ""}>
            <SelectTrigger id="staff-department" className="w-full bg-background">
              <SelectValue placeholder="Choose a department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map(d => (
                <SelectItem key={d.id} value={d.id.toString()}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!levelChosen ? (
        <p className="text-sm text-muted-foreground">Choose an access level to see what they will be able to open.</p>
      ) : (
        <details className="group rounded-lg border">
          <summary className="cursor-pointer select-none px-3 py-2.5 text-sm font-medium">
            Advanced: change access for single areas
            <span className="block text-xs font-normal text-muted-foreground">
              {isSuperAdmin
                ? "Super Admin always has full access to every area."
                : `Normally the access level decides everything.${Object.keys(overrides).length ? ` ${Object.keys(overrides).length} area${Object.keys(overrides).length === 1 ? " is" : "s are"} changed for this person.` : ""}`}
            </span>
          </summary>
          <div className="border-t p-3">
            <PermissionMatrix
              modules={modules}
              value={effective}
              inherited={isSuperAdmin ? undefined : inherited}
              onChange={onOverrideChange}
              onReset={onOverrideReset}
              disabled={!canManageAccess || isSuperAdmin}
            />
          </div>
        </details>
      )}
    </div>
  )
}
