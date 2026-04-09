import { Card, CardContent } from "@/components/ui/card"
import { ClipboardCheck, Clock, CheckCircle2, AlertCircle } from "lucide-react"
import { getAllExams, getExamStats } from "@/lib/supabase/queries/exam-management"
import { ExamManagementTable } from "./exam-management-table"

type PageParams = { searchParams: Promise<{ status?: string; page?: string }> }

export default async function ExamManagementPage({ searchParams }: PageParams) {
  const { status, page: pageStr } = await searchParams
  const statusId = status ? parseInt(status, 10) : undefined
  const page = pageStr ? parseInt(pageStr, 10) : 1

  const [result, stats] = await Promise.all([
    getAllExams({ statusId, page, pageSize: 50 }),
    getExamStats(),
  ])

  const { exams, totalCount, totalPages } = result

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Exam Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Confirm dates, enter scores, and manage all exam bookings</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={AlertCircle} label="Pending" value={stats.pending} bg="bg-amber-500/10" color="text-amber-600" />
        <StatCard icon={Clock} label="Confirmed" value={stats.confirmed} bg="bg-blue-500/10" color="text-blue-600" />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} bg="bg-emerald-500/10" color="text-emerald-600" />
        <StatCard icon={ClipboardCheck} label="Total" value={stats.total} bg="bg-primary/10" color="text-primary" />
      </div>

      <ExamManagementTable exams={exams} currentStatus={statusId} page={page} totalPages={totalPages} totalCount={totalCount} />
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
