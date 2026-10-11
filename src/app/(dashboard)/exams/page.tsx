import Link from "next/link"
import { Button } from "@/components/ui/button"
import { requireAccess } from "@/lib/permissions/guard"
import { MODULES } from "@/lib/permissions/modules"
import { resolveExamView, type ExamView } from "@/lib/exams/exam-page-search-params"
import type { RawSearchParams } from "@/lib/scheduler/search-params"
import { ExamDeskView } from "./exam-desk-view"
import { ExamListView } from "./exam-list-view"

type PageParams = { searchParams: Promise<RawSearchParams> }

const VIEWS: { view: ExamView; label: string; href: string; hint: string }[] = [
  { view: "desk", label: "Exam desk", href: "/exams", hint: "Who sits an examination on the chosen dates, and who has arrived" },
  { view: "all", label: "All exams", href: "/exams?view=all", hint: "Requests to schedule, scores and the record of past exams" },
]

export default async function ExamManagementPage({ searchParams }: PageParams) {
  await requireAccess(MODULES.EXAMS)

  const raw = await searchParams
  const current = resolveExamView(raw)
  const hint = VIEWS.find(v => v.view === current)?.hint

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Exam Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
        </div>
        <nav aria-label="Exam views" className="flex items-center gap-1">
          {VIEWS.map(({ view, label, href }) => (
            <Button key={view} variant={view === current ? "default" : "ghost"} size="sm" asChild>
              <Link href={href} aria-current={view === current ? "page" : undefined}>{label}</Link>
            </Button>
          ))}
        </nav>
      </div>

      {current === "desk" ? <ExamDeskView raw={raw} /> : <ExamListView raw={raw} />}
    </div>
  )
}
