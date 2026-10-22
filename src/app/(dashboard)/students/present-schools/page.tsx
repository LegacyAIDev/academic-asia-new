import { canAccess, requireAccess } from "@/lib/permissions/guard"
import { ACCESS, MODULES } from "@/lib/permissions/modules"
import { getPresentSchoolsWithCounts } from "@/lib/supabase/queries/present-schools"
import { PresentSchoolsTable } from "./present-schools-table"

/** The list staff pick a student's current school from: everyone with Students access sees it, editors add and rename. */
export default async function PresentSchoolsPage() {
  await requireAccess(MODULES.STUDENTS)

  const [canManage, schools] = await Promise.all([
    canAccess(MODULES.STUDENTS, ACCESS.WRITE),
    getPresentSchoolsWithCounts(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Students</p>
        <h1 className="text-2xl font-semibold tracking-tight">Current Schools</h1>
        <p className="text-sm text-muted-foreground mt-1">
          The schools students attend now. Staff pick from this list in the student form.
        </p>
      </div>

      <PresentSchoolsTable schools={schools} canManage={canManage} />
    </div>
  )
}
