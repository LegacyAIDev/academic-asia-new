import Link from "next/link"
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
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Students&apos; current schools</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          The schools in Hong Kong (and elsewhere) that our students attend now, picked from this list in the student form.
          Not the schools they apply to: those are under <Link href="/schools" className="font-medium text-brand-navy underline-offset-4 hover:underline">Schools</Link>.
        </p>
      </div>

      <PresentSchoolsTable schools={schools} canManage={canManage} />
    </div>
  )
}
