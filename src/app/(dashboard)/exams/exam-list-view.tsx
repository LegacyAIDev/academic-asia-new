import { redirect } from "next/navigation"
import { AlertCircle, CheckCircle2, ClipboardCheck, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
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
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={AlertCircle} label="Pending" value={stats.pending} bg="bg-amber-500/10" color="text-amber-600" />
        <StatCard icon={Clock} label="Confirmed" value={stats.confirmed} bg="bg-blue-500/10" color="text-blue-600" />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} bg="bg-emerald-500/10" color="text-emerald-600" />
        <StatCard icon={ClipboardCheck} label="Total" value={stats.total} bg="bg-primary/10" color="text-primary" />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <ExamDateRangeFilter key={`${from ?? ""}|${to ?? ""}`} from={from ?? ""} to={to ?? ""} />
        <p className="pb-2 text-xs text-muted-foreground">
          Filters by scheduled date. Requests that are not scheduled yet have none and drop out.
        </p>
      </div>

      <ExamManagementTable
        exams={exams}
        links={links}
        canSchedule={canSchedule}
        notes={{ canWrite: canWriteNotes, currentUserId }}
        currentStatus={statusId}
        range={{ from, to }}
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
      />
    </div>
  )
}

function StatCard({ icon: Icon, label, value, bg, color }: {
  icon: React.ElementType; label: string; value: number; bg: string; color: string
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div>
            <p className="text-2xl font-semibold">{value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
