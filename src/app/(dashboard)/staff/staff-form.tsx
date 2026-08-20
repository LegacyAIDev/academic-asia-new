"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Save, Loader2, ArrowLeft, User, Mail, Phone, Shield, Briefcase, FileText, KeyRound,
} from "lucide-react"
import Link from "next/link"
import { createStaff, updateStaff, type StaffInput } from "@/lib/supabase/actions/staff"
import type { StaffListItem } from "@/lib/supabase/queries/staff"
import { setProfilePermissions } from "@/lib/supabase/actions/permissions"
import { StaffAccessCard } from "./staff-access-card"
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
}

const inputStyles = "bg-background"

/** Shared form for creating and editing staff profiles */
export function StaffForm({
  mode,
  staff,
  departments,
  adminLevels,
  modules,
  levelDefaults,
  initialOverrides = {},
  canManageAccess,
}: StaffFormProps) {
  const router = useRouter()
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

      router.push(staffId ? `/staff/${staffId}` : "/staff")
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={staff?.id ? `/staff/${staff.id}` : "/staff"}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "create" ? "New Staff Member" : "Edit Staff Member"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "create" ? "Add a new team member" : `Editing ${staff?.first_name} ${staff?.surname}`}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Personal Information */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <User className="h-4 w-4 text-muted-foreground" />
              Personal Information
            </CardTitle>
            <CardDescription>Basic details about the staff member</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>First Name <span className="text-destructive">*</span></Label>
              <Input name="first_name" defaultValue={staff?.first_name ?? ""} className={inputStyles} required />
            </div>
            <div className="space-y-2">
              <Label>Surname <span className="text-destructive">*</span></Label>
              <Input name="surname" defaultValue={staff?.surname ?? ""} className={inputStyles} required />
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              <Input name="position" defaultValue={staff?.position ?? ""} className={inputStyles} placeholder="e.g. Senior Consultant" />
            </div>
            <div className="space-y-2">
              <Label>Join Date</Label>
              <Input type="date" name="join_date" defaultValue={staff?.join_date ?? ""} className={inputStyles} />
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Email (Primary) {mode === "create" && <span className="text-destructive">*</span>}</Label>
              <Input type="email" name="email_1" defaultValue={staff?.email_1 ?? ""} className={inputStyles} placeholder="name@academic-asia.com" required={mode === "create"} />
            </div>
            <div className="space-y-2">
              <Label>Email (Secondary)</Label>
              <Input type="email" name="email_2" defaultValue={staff?.email_2 ?? ""} className={inputStyles} />
            </div>
            <div className="space-y-2">
              <Label>Telephone</Label>
              <Input name="telephone" defaultValue={staff?.telephone ?? ""} className={inputStyles} />
            </div>
            <div className="space-y-2">
              <Label>Mobile</Label>
              <Input name="mobile" defaultValue={staff?.mobile ?? ""} className={inputStyles} placeholder="+xx - xxxx" />
            </div>
            <div className="space-y-2">
              <Label>Fax</Label>
              <Input name="fax" defaultValue={staff?.fax ?? ""} className={inputStyles} />
            </div>
          </CardContent>
        </Card>

        {/* Login Credentials */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              Login Credentials
            </CardTitle>
            <CardDescription>
              {mode === "create"
                ? "Set a password for the staff member to log in"
                : "Leave blank to keep the current password"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Password {mode === "create" && <span className="text-destructive">*</span>}</Label>
              <Input
                type="password"
                name="password"
                className={inputStyles}
                placeholder={mode === "create" ? "Set password" : "Leave blank to keep current"}
                minLength={6}
                required={mode === "create"}
              />
            </div>
            <div className="space-y-2 flex items-end">
              <p className="text-xs text-muted-foreground pb-2.5">
                Minimum 6 characters. The staff member will use their email and this password to sign in.
              </p>
            </div>
          </CardContent>
        </Card>

        <StaffAccessCard
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

        {/* Caseload */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              Caseload
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Yearly Cases</Label>
              <Input type="number" name="yearly_case_count" defaultValue={staff?.yearly_case_count ?? ""} className={inputStyles} />
            </div>
            <div className="space-y-2">
              <Label>Weekly Cases</Label>
              <Input type="number" name="weekly_case_count" defaultValue={staff?.weekly_case_count ?? ""} className={inputStyles} />
            </div>
            <div className="space-y-2">
              <Label>Daily Cases</Label>
              <Input type="number" name="daily_case_count" defaultValue={staff?.daily_case_count ?? ""} className={inputStyles} />
            </div>
          </CardContent>
        </Card>

        {/* Remarks */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Remarks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea name="remarks" defaultValue={staff?.remarks ?? ""} rows={3} className={inputStyles} placeholder="Additional notes..." />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" asChild>
            <Link href={staff?.id ? `/staff/${staff.id}` : "/staff"}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={isPending} className="min-w-[140px] gap-2 shadow-sm">
            {isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" />{mode === "create" ? "Creating..." : "Saving..."}</>
            ) : (
              <><Save className="h-4 w-4" />{mode === "create" ? "Create Staff" : "Save Changes"}</>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
