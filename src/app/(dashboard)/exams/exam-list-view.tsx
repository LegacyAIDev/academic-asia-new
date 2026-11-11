import { redirect } from "next/navigation"
import { canAccess } from "@/lib/permissions/guard"
import { ACCESS, MODULES } from "@/lib/permissions/modules"
import { examListHref, parseExamListParams } from "@/lib/exams/exam-page-search-params"
import type { RawSearchParams } from "@/lib/scheduler/search-params"
import { getAllExams, getExamStats } from "@/lib/supabase/queries/exam-management"
import { getExamBookingLinks } from "@/lib/supabase/queries/scheduler-exams"
import { getSignedInUserId } from "@/lib/supabase/queries/record-notes"
import { ExamDateRangeFilter } from "./exam-date-range-filter"
import { ExamManagementTable } from "./exam-management-table"

/**
 * Every exam record with its status: requests still to be scheduled, confirmed
 * exams and the history of completed ones. The optional date range looks at the
 * scheduled date, which is how past exams are found again.
 */
export async function ExamListView({ raw }: { raw: RawSearchParams }) {
  const { statusId, page, from, to } = parseExamListParams(raw)

  const [result, stats] = await Promise.all([
    getAllExams({ statusId, page, pageSize: 50, from, to }),
    getExamStats(),
  ])
  const { exams, totalCount, totalPages } = result
  // A page past the end (an old link, or a filter that shortened the list) would show an empty table.
  if (page > 1 && exams.length === 0) redirect(examListHref({ status: statusId, from, to }))

  const [links, canSchedule, canWriteNotes, currentUserId] = await Promise.all([
    getExamBookingLinks(exams.map(exam => exam.id)),
    canAccess(MODULES.SCHEDULER, ACCESS.WRITE),
    canAccess(MODULES.EXAMS, ACCESS.WRITE),
    getSignedInUserId(),
  ])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <ExamDateRangeFilter key={`${from ?? ""}|${to ?? ""}`} from={from ?? ""} to={to ?? ""} />
        <p className="pb-2 text-xs text-muted-foreground">
          Dates look at when the exam is booked, so requests without a date are left out.
        </p>
      </div>

      <ExamManagementTable
        exams={exams}
        links={links}
        canSchedule={canSchedule}
        notes={{ canWrite: canWriteNotes, currentUserId }}
        currentStatus={statusId}
        stats={stats}
        range={{ from, to }}
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
      />
    </div>
  )
}

