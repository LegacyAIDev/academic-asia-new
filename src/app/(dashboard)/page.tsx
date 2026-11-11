import { CalendarDays, ListTodo, School, Search, UserPlus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ScheduleBookingButton } from "@/components/scheduler/schedule-booking-button"
import { AttentionPanel } from "@/components/dashboard/attention-panel"
import { ExamLoadPanel } from "@/components/dashboard/exam-load-panel"
import { KpiStrip, type Kpi } from "@/components/dashboard/kpi-strip"
import { PipelinePanel } from "@/components/dashboard/pipeline-panel"
import { RecentActivityPanel } from "@/components/dashboard/recent-activity-panel"
import { ShortcutsPanel, type Shortcut } from "@/components/dashboard/shortcuts-panel"
import { TodayPanel } from "@/components/dashboard/today-panel"
import { AddStudentSheet } from "./students/[id]/edit-student-sheet"
import { attentionItems, greeting } from "@/lib/dashboard/attention"
import { hkToday } from "@/lib/hk-day"
import { EXAM_PAPER_ACCESS } from "@/lib/attachments/exam-paper-access"
import { canAccess, requireAccess } from "@/lib/permissions/guard"
import { ACCESS, MODULES } from "@/lib/permissions/modules"
import { getCurrentUser } from "@/lib/supabase/auth"
import {
  getApplicationPipeline, getDashboardCounts, getExamLoad, getMyBookingsToday, getRecentActivity,
} from "@/lib/supabase/queries/dashboard"
import { getMyTasks } from "@/lib/supabase/queries/staff-tasks"

/**
 * Home page: what needs the person today, their own day, where the season's
 * applications stand, the coming fortnight of exams and the latest changes.
 * Every block appears only for those who may open what it links to.
 */
export default async function DashboardPage() {
  await requireAccess(MODULES.DASHBOARD)
  const today = hkToday()
  const [user, students, studentsWrite, schools, schoolsWrite, scheduler, schedulerWrite, events, eventsWrite, examPapers] = await Promise.all([
    getCurrentUser(),
    canAccess(MODULES.STUDENTS, ACCESS.READ), canAccess(MODULES.STUDENTS, ACCESS.WRITE),
    canAccess(MODULES.SCHOOLS, ACCESS.READ), canAccess(MODULES.SCHOOLS, ACCESS.WRITE),
    canAccess(MODULES.SCHEDULER, ACCESS.READ), canAccess(MODULES.SCHEDULER, ACCESS.WRITE),
    canAccess(MODULES.EVENTS, ACCESS.READ), canAccess(MODULES.EVENTS, ACCESS.WRITE),
    canAccess(EXAM_PAPER_ACCESS.module, EXAM_PAPER_ACCESS.read),
  ])

  const [counts, tasks, myDay, activity, pipeline, examLoad] = await Promise.all([
    getDashboardCounts({ students, scheduler, events }, today),
    getMyTasks(),
    scheduler && user ? getMyBookingsToday(user.id, today) : Promise.resolve(null),
    getRecentActivity({ students, schools, scheduler, examPapers }),
    students ? getApplicationPipeline() : Promise.resolve(null),
    scheduler ? getExamLoad(today) : Promise.resolve(null),
  ])

  // "Awaiting confirmation" means the next 7 days everywhere on the page; later
  // ones still show in gold on the 14-day chart.
  const thisWeek = examLoad?.slice(0, 7) ?? null
  const pendingExams = thisWeek
    ? { count: thisWeek.reduce((sum, day) => sum + day.pending, 0), earliestDate: thisWeek.find(day => day.pending > 0)?.day ?? null }
    : null
  const attention = attentionItems({ pendingExams, tasks: tasks?.active ?? null, examsThisWeek: counts.examsNext7Days, today })
  const dateLine = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Hong_Kong" }).format(new Date())

  const inProgress = pipeline?.reduce((sum, stage) => sum + stage.count, 0) ?? null
  const offers = pipeline?.find(stage => stage.stage === "offer_received")?.count ?? null
  const plural = (n: number, one: string, many: string) => `${n.toLocaleString("en-GB")} ${n === 1 ? one : many}`

  const kpis: Kpi[] = [
    ...(students ? [
      {
        label: "Active students", value: counts.activeStudents,
        href: counts.activeStatusId ? `/students?status=${counts.activeStatusId}` : "/students",
        note: counts.studentsAddedThisMonth === null ? null : `${plural(counts.studentsAddedThisMonth, "student", "students")} added this month`,
      },
      { label: "Applications in progress", value: inProgress, href: "/students", note: offers === null ? null : `${plural(offers, "offer", "offers")} received` },
    ] : []),
    ...(scheduler ? [{
      label: "Exams in the next 7 days", value: counts.examsNext7Days, href: "/exams",
      note: pendingExams?.count ? `${pendingExams.count.toLocaleString("en-GB")} awaiting confirmation` : "All confirmed",
    }] : []),
    ...(events ? [{ label: "Events in the next 30 days", value: counts.eventsNext30Days, href: "/events", note: null }] : []),
  ]

  const shortcuts: Shortcut[] = [
    ...(studentsWrite ? [{ label: "Add a student", href: "/?add=student", icon: UserPlus }] : []),
    ...(schoolsWrite ? [{ label: "Add a school", href: "/schools/new", icon: School }] : []),
    ...(eventsWrite ? [{ label: "Plan an event", href: "/events", icon: CalendarDays }] : []),
    { label: "Add a task", href: "/tasks", icon: ListTodo },
  ]

  return (
    <div className="mx-auto max-w-[1320px] space-y-4">
      <header className="flex flex-col gap-4 pb-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
            {greeting()}{user?.first_name ? `, ${user.first_name}` : ""}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{dateLine}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {students && (
            <form action="/students" role="search" className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input name="search" placeholder="Find a student" aria-label="Find a student by name, code or email" className="bg-card pl-9" />
            </form>
          )}
          {schedulerWrite && <ScheduleBookingButton label="New booking" variant="outline" size="default" />}
          {studentsWrite && <AddStudentSheet />}
        </div>
      </header>

      <KpiStrip kpis={kpis} />

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="grid gap-4 lg:col-span-2">
          <AttentionPanel items={attention} />
          {/* On phones the person's own day follows straight after what needs them. */}
          {scheduler && <div className="lg:hidden"><TodayPanel bookings={myDay} /></div>}
          {scheduler && <ExamLoadPanel days={examLoad} />}
          {students && <PipelinePanel stages={pipeline} />}
        </div>
        <div className="grid gap-4">
          {scheduler && <div className="hidden lg:block"><TodayPanel bookings={myDay} /></div>}
          <RecentActivityPanel entries={activity} />
          <ShortcutsPanel shortcuts={shortcuts} />
        </div>
      </div>
    </div>
  )
}
