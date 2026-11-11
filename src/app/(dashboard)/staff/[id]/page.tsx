import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Panel } from "@/components/ui/panel"
import { getStaffById, getStaffSignIn } from "@/lib/supabase/queries/staff"
import { getAllLevelPermissions, getPermissionModules, getProfileOverrides } from "@/lib/supabase/queries/permissions"
import { getCurrentUser } from "@/lib/supabase/auth"
import { canAccess, requireAccess } from "@/lib/permissions/guard"
import { ACCESS, MODULES, type AccessLevel } from "@/lib/permissions/modules"
import { ADMIN_LEVELS } from "@/lib/auth-utils"
import { StaffHeaderActions } from "./staff-header-actions"

type StaffDetailPageParams = {
  params: Promise<{ id: string }>
}

const ACCESS_WORDS: Record<AccessLevel, string> = {
  [ACCESS.NONE]: "No access",
  [ACCESS.READ]: "Can view",
  [ACCESS.WRITE]: "Can view and change",
}

export default async function StaffDetailPage({ params }: StaffDetailPageParams) {
  await requireAccess(MODULES.STAFF)
  const { id } = await params

  const [staff, canWrite, signIn, modules, levelDefaults, overrides, currentUser] = await Promise.all([
    getStaffById(id),
    canAccess(MODULES.STAFF, ACCESS.WRITE),
    getStaffSignIn(id),
    getPermissionModules(),
    getAllLevelPermissions(),
    getProfileOverrides(id),
    getCurrentUser(),
  ])
  if (!staff) notFound()

  const fullName = [staff.first_name, staff.surname].filter(Boolean).join(" ") || "Unnamed"
  const active = signIn?.active ?? true
  const isSuperAdmin = staff.admin_level === ADMIN_LEVELS.SUPER_ADMIN
  // What they can open: the level's defaults with this person's own changes on top.
  const effective: Record<number, AccessLevel> = isSuperAdmin
    ? Object.fromEntries(modules.map(m => [m.id, ACCESS.WRITE]))
    : { ...(staff.admin_level === null ? {} : levelDefaults[staff.admin_level] ?? {}), ...overrides }
  const changedForThem = Object.keys(overrides).length

  const contact = [
    { label: "Email", value: staff.email_1, href: staff.email_1 ? `mailto:${staff.email_1}` : null },
    { label: "Second email", value: staff.email_2, href: staff.email_2 ? `mailto:${staff.email_2}` : null },
    { label: "Mobile", value: staff.mobile, href: staff.mobile ? `tel:${staff.mobile}` : null },
    { label: "Telephone", value: staff.telephone, href: staff.telephone ? `tel:${staff.telephone}` : null },
    { label: "Fax", value: staff.fax, href: null },
  ].filter(item => item.value)
  const caseload = [
    { label: "Per year", value: staff.yearly_case_count },
    { label: "Per week", value: staff.weekly_case_count },
    { label: "Per day", value: staff.daily_case_count },
  ].filter(item => item.value != null)
  const hasCaseload = caseload.some(item => (item.value ?? 0) > 0)

  return (
    <div className="space-y-4">
      <Link href="/staff" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Staff
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{fullName}</h1>
            {!active && <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">Deactivated</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {[
              staff.position,
              staff.department?.label,
              staff.join_date ? `joined ${new Date(staff.join_date).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}` : null,
            ].filter(Boolean).join(" · ") || "No position or department yet"}
          </p>
        </div>
        {canWrite && <StaffHeaderActions staffId={staff.id} name={fullName} active={active} isSelf={currentUser?.id === staff.id} />}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Access" action={staff.admin_level_label ? <Badge variant="outline" className="text-xs font-medium">{staff.admin_level_label}</Badge> : null} flush>
            {staff.admin_level === null ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">No access level yet, so they can’t open anything. Use Edit details to choose one.</p>
            ) : (
              <>
                <ul className="divide-y">
                  {modules.map(module => {
                    const access = effective[module.id] ?? ACCESS.NONE
                    const changed = !isSuperAdmin && module.id in overrides
                    return (
                      <li key={module.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                        <span>{module.label}</span>
                        <span className={access === ACCESS.NONE ? "text-muted-foreground" : "font-medium"}>
                          {ACCESS_WORDS[access]}
                          {changed && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(changed for them)</span>}
                        </span>
                      </li>
                    )
                  })}
                </ul>
                <p className="border-t px-4 py-2 text-xs text-muted-foreground">
                  {isSuperAdmin
                    ? "Super Admin can view and change everything."
                    : changedForThem
                      ? `Set by the ${staff.admin_level_label ?? "access"} level, with ${changedForThem} area${changedForThem === 1 ? "" : "s"} changed for them.`
                      : `Set by the ${staff.admin_level_label ?? "access"} level.`}
                </p>
              </>
            )}
          </Panel>

          {staff.remarks && (
            <Panel title="Remarks">
              <p className="whitespace-pre-wrap text-sm">{staff.remarks}</p>
            </Panel>
          )}
        </div>

        <div className="space-y-4">
          <Panel title="Contact">
            {contact.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contact details yet.</p>
            ) : (
              <dl className="space-y-3">
                {contact.map(item => (
                  <div key={item.label}>
                    <dt className="text-xs text-muted-foreground">{item.label}</dt>
                    <dd className="break-words text-sm">
                      {item.href ? <a href={item.href} className="hover:text-brand-navy hover:underline">{item.value}</a> : item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </Panel>

          <Panel title="Signing in">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Status</dt>
                <dd>{active ? "Can sign in" : "Deactivated: cannot sign in"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Last signed in</dt>
                <dd>{signIn?.lastSignInAt
                  ? new Date(signIn.lastSignInAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Hong_Kong" })
                  : "Never"}</dd>
              </div>
            </dl>
          </Panel>

          {hasCaseload && (
            <Panel title="Caseload">
              <dl className="grid grid-cols-3 gap-3 text-center">
                {caseload.map(item => (
                  <div key={item.label} className="rounded-md bg-muted/50 p-2">
                    <dd className="text-lg font-semibold tabular-nums">{item.value}</dd>
                    <dt className="text-xs text-muted-foreground">{item.label}</dt>
                  </div>
                ))}
              </dl>
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}
