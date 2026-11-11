"use client"

import { useState, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { DateField } from "@/components/ui/date-field"
import { createStaff, updateStaff, type StaffInput } from "@/lib/supabase/actions/staff"
import type { StaffListItem } from "@/lib/supabase/queries/staff"
import { setProfilePermissions } from "@/lib/supabase/actions/permissions"
import { StaffAccessSection } from "./staff-access-section"
import type { MatrixModule } from "@/components/permissions/permission-matrix"
import type { AccessLevel } from "@/lib/permissions/modules"

type StaffFormProps = {
  mode: "create" | "edit"
  staff?: StaffListItem | null
  departments: { id: number; label: string }[]
  adminLevels: { id: number; label: string }[]
  modules: MatrixModule[]
  levelDefaults: Record<number, Record<number, AccessLevel>>
  /** Existing per-module deviations for this staff member, keyed by module id. */
  initialOverrides?: Record<number, AccessLevel>
  /** False when the signed-in user may not change another person's access. */
  canManageAccess: boolean
  /** Called after a save, with the staff member's id. */
  onDone: (id: string | undefined) => void
  onCancel: () => void
}

const inputStyles = "bg-background"

/** One titled block of the staff form. */
function FormSection({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t pt-5 first:border-t-0 first:pt-0">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

/** Shared form for adding and editing staff, shown in a side drawer. */
export function StaffForm({
  mode,
  staff,
  departments,
  adminLevels,
  modules,
  levelDefaults,
  initialOverrides = {},
  canManageAccess,
  onDone,
  onCancel,
}: StaffFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [adminLevel, setAdminLevel] = useState<number | null>(staff?.admin_level ?? null)
  const [overrides, setOverrides] = useState<Record<number, AccessLevel>>(initialOverrides)

  const inherited = adminLevel === null ? {} : (levelDefaults[adminLevel] ?? {})

  // Setting a row back to what the level grants is not an override — drop it, so
  // the person keeps inheriting future changes to that level.
  const handleOverrideChange = (moduleId: number, access: AccessLevel) => {
    setOverrides(prev => {
      const next = { ...prev }
      if (access === (inherited[moduleId] ?? 0)) delete next[moduleId]
      else next[moduleId] = access
      return next
    })
  }

  const handleOverrideReset = (moduleId: number) => {
    setOverrides(prev => {
      const next = { ...prev }
      delete next[moduleId]
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    if (adminLevel === null) {
      setError("Choose an access level, so they can open the parts of the CRM they need.")
      return
    }
    const fd = new FormData(e.currentTarget)

    const str = (key: string) => (fd.get(key) as string) || null
    const int = (key: string) => {
      const v = fd.get(key) as string
      return v ? parseInt(v, 10) : null
    }

    const input: StaffInput = {
      first_name: (fd.get("first_name") as string) ?? "",
      surname: (fd.get("surname") as string) ?? "",
      email_1: str("email_1"),
      email_2: str("email_2"),
      telephone: str("telephone"),
      mobile: str("mobile"),
      fax: str("fax"),
      department_id: int("department_id"),
      admin_level: adminLevel,
      position: str("position"),
      join_date: str("join_date"),
      yearly_case_count: int("yearly_case_count"),
      weekly_case_count: int("weekly_case_count"),
      daily_case_count: int("daily_case_count"),
      remarks: str("remarks"),
      password: str("password"),
    }

    startTransition(async () => {
      let result
      if (mode === "create") {
        result = await createStaff(input)
      } else if (staff?.id) {
        result = await updateStaff(staff.id, input)
      }

      if (!result?.success) {
        setError(result?.error ?? "An error occurred")
        return
      }

      const staffId = mode === "create" ? result.data?.id : staff?.id

      // Access rights are saved separately: on create the profile id only exists
      // once createStaff has returned it.
      if (staffId && canManageAccess && adminLevel !== 0) {
        const effective = { ...inherited, ...overrides }
        const permResult = await setProfilePermissions(staffId, effective)
        if (!permResult.success) {
          setError(permResult.error ?? "Staff saved, but access rights were not.")
          return
        }
      }

      onDone(staffId)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="@container space-y-5" noValidate>
      {error && (
        <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <FormSection title="Name and role">
        <div className="grid gap-4 @md:grid-cols-2 [&>*]:min-w-0">
          <div className="space-y-2">
            <Label htmlFor="staff-first-name">First name <span className="text-destructive">*</span></Label>
            <Input id="staff-first-name" name="first_name" defaultValue={staff?.first_name ?? ""} className={inputStyles} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-surname">Surname <span className="text-destructive">*</span></Label>
            <Input id="staff-surname" name="surname" defaultValue={staff?.surname ?? ""} className={inputStyles} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-position">Position</Label>
            <Input id="staff-position" name="position" defaultValue={staff?.position ?? ""} className={inputStyles} placeholder="e.g. Senior Consultant" />
          </div>
          <div className="space-y-2">
            <Label>Joined</Label>
            <DateField name="join_date" defaultValue={staff?.join_date ?? null} placeholder="Pick a date" />
          </div>
        </div>
      </FormSection>

      <FormSection title="Access" hint="What they can open in the CRM.">
        <StaffAccessSection
          departments={departments}
          adminLevels={adminLevels}
          modules={modules}
          levelDefaults={levelDefaults}
          defaultDepartmentId={staff?.department_id}
          adminLevel={adminLevel}
          onAdminLevelChange={setAdminLevel}
          overrides={overrides}
          onOverrideChange={handleOverrideChange}
          onOverrideReset={handleOverrideReset}
          canManageAccess={canManageAccess}
        />
      </FormSection>

      <FormSection
        title="Signing in"
        hint={mode === "create" ? "They sign in with this email and password." : "Leave the password blank to keep the current one."}
      >
        <div className="grid gap-4 @md:grid-cols-2 [&>*]:min-w-0">
          <div className="space-y-2">
            <Label htmlFor="staff-email">Email {mode === "create" && <span className="text-destructive">*</span>}</Label>
            <Input id="staff-email" type="email" name="email_1" defaultValue={staff?.email_1 ?? ""} className={inputStyles} placeholder="name@academic-asia.com" required={mode === "create"} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-password">Password {mode === "create" && <span className="text-destructive">*</span>}</Label>
            <Input
              id="staff-password"
              type="password"
              name="password"
              autoComplete="new-password"
              className={inputStyles}
              placeholder={mode === "create" ? "At least 6 characters" : "Leave blank to keep"}
              minLength={6}
              required={mode === "create"}
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Other contact details">
        <div className="grid gap-4 @md:grid-cols-2 [&>*]:min-w-0">
          <div className="space-y-2">
            <Label htmlFor="staff-email-2">Second email</Label>
            <Input id="staff-email-2" type="email" name="email_2" defaultValue={staff?.email_2 ?? ""} className={inputStyles} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-mobile">Mobile</Label>
            <Input id="staff-mobile" name="mobile" defaultValue={staff?.mobile ?? ""} className={inputStyles} placeholder="+852 …" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-telephone">Telephone</Label>
            <Input id="staff-telephone" name="telephone" defaultValue={staff?.telephone ?? ""} className={inputStyles} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-fax">Fax</Label>
            <Input id="staff-fax" name="fax" defaultValue={staff?.fax ?? ""} className={inputStyles} />
          </div>
        </div>
      </FormSection>

      <FormSection title="Caseload" hint="How many cases they usually handle.">
        <div className="grid gap-4 @md:grid-cols-3 [&>*]:min-w-0">
          <div className="space-y-2">
            <Label htmlFor="staff-yearly">Per year</Label>
            <Input id="staff-yearly" type="number" min={0} name="yearly_case_count" defaultValue={staff?.yearly_case_count ?? ""} className={inputStyles} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-weekly">Per week</Label>
            <Input id="staff-weekly" type="number" min={0} name="weekly_case_count" defaultValue={staff?.weekly_case_count ?? ""} className={inputStyles} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-daily">Per day</Label>
            <Input id="staff-daily" type="number" min={0} name="daily_case_count" defaultValue={staff?.daily_case_count ?? ""} className={inputStyles} />
          </div>
        </div>
      </FormSection>

      <FormSection title="Remarks">
        <Textarea name="remarks" defaultValue={staff?.remarks ?? ""} rows={3} className={inputStyles} placeholder="Anything colleagues should know" />
      </FormSection>

      {/* Save stays in view however long the form gets. */}
      <div className="sticky bottom-0 z-10 -mx-6 flex items-center justify-end gap-2 border-t bg-background px-6 py-3">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>Cancel</Button>
        <Button type="submit" disabled={isPending} className="min-w-[140px] gap-2">
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "create" ? "Add staff member" : "Save changes"}
        </Button>
      </div>
    </form>
  )
}
