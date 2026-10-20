import { Suspense } from "react"
import { notFound } from "next/navigation"
import { canAccess, requireAccess } from "@/lib/permissions/guard"
import { ACCESS, MODULES } from "@/lib/permissions/modules"
import { resolveSchoolTab } from "@/lib/schools/school-tabs"
import { getSchoolById } from "@/lib/supabase/queries/schools"
import { getSchoolContactCount } from "@/lib/supabase/queries/school-contacts"
import { getSchoolCourseCount } from "@/lib/supabase/queries/school-courses"
import { getSchoolBankDetailCount } from "@/lib/supabase/queries/school-bank-details"
import { getSchoolVisitCount } from "@/lib/supabase/queries/school-visits"
import { SchoolHeader } from "./school-header"
import { SchoolTabNav } from "./school-tab-nav"
import { SchoolTabSkeleton } from "./school-tab-skeleton"
import { SCHOOL_TAB_CONTENT } from "./school-tab-content"

type SchoolDetailPageParams = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string | string[]; supPage?: string | string[] }>
}

/**
 * A school's profile. The header and tab bar render straight away; only the
 * open tab loads its data, behind its own loading state (customer item 8:
 * "kept simple and organised").
 */
export default async function SchoolDetailPage({ params, searchParams }: SchoolDetailPageParams) {
  await requireAccess(MODULES.SCHOOLS)

  const { id } = await params
  const { tab: rawTab, supPage: rawSupPage } = await searchParams
  const tab = resolveSchoolTab(rawTab)
  const supPage = Math.max(1, Number.parseInt(String(Array.isArray(rawSupPage) ? rawSupPage[0] : rawSupPage ?? "1"), 10) || 1)

  // Counts are kept only where they help choose a tab: active contacts, and the
  // three tabs in the "More" menu, which are otherwise out of sight.
  const [school, canWrite, contactCount, courseCount, bankDetailCount, visitCount] = await Promise.all([
    getSchoolById(id),
    canAccess(MODULES.SCHOOLS, ACCESS.WRITE),
    getSchoolContactCount(id),
    getSchoolCourseCount(id),
    getSchoolBankDetailCount(id),
    getSchoolVisitCount(id),
  ])

  if (!school) notFound()

  const ActiveTab = SCHOOL_TAB_CONTENT[tab]

  return (
    <div className="space-y-6">
      <SchoolHeader school={school} canWrite={canWrite} />
      <SchoolTabNav
        schoolId={id}
        current={tab}
        counts={{ contacts: contactCount, courses: courseCount, "bank-details": bankDetailCount, visits: visitCount }}
      />
      <Suspense key={tab} fallback={<SchoolTabSkeleton />}>
        <ActiveTab schoolId={id} school={school} canWrite={canWrite} supPage={supPage} />
      </Suspense>
    </div>
  )
}
