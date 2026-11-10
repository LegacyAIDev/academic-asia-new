import Link from "next/link"
import { CalendarDays, ClipboardCheck, FileText, ListTodo, School, UserPlus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScheduleBookingButton } from "@/components/scheduler/schedule-booking-button"
import { AttentionPanel } from "@/components/dashboard/attention-panel"
import { QuickStartPanel, type QuickStart } from "@/components/dashboard/quick-start-panel"
import { RecentActivityPanel } from "@/components/dashboard/recent-activity-panel"
import { StatTiles, type StatTile } from "@/components/dashboard/stat-tiles"
import { TodayPanel } from "@/components/dashboard/today-panel"
import { attentionItems, greeting } from "@/lib/dashboard/attention"
import { hkToday } from "@/lib/hk-day"
import { EXAM_PAPER_ACCESS } from "@/lib/attachments/exam-paper-access"
import { canAccess, requireAccess } from "@/lib/permissions/guard"
import { ACCESS, MODULES } from "@/lib/permissions/modules"
import { getCurrentUser } from "@/lib/supabase/auth"
import { getDashboardCounts, getMyBookingsToday, getRecentActivity } from "@/lib/supabase/queries/dashboard"
import { getPendingExamBookings } from "@/lib/supabase/queries/scheduler-stats"
import { getMyTasks } from "@/lib/supabase/queries/staff-tasks"

/**
 * Home page: what needs the person now, their day, the real numbers and where to
 * start. Every block appears only for those who may open what it links to.
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

  const [counts, pendingExams, tasks, myDay, activity] = await Promise.all([
    getDashboardCounts({ students, scheduler, events }, today),
    scheduler ? getPendingExamBookings() : Promise.resolve(null),
    getMyTasks(),
    scheduler && user ? getMyBookingsToday(user.id, today) : Promise.resolve(null),
    getRecentActivity({ students, schools, scheduler, examPapers }),
  ])

  const attention = attentionItems({ pendingExams, tasks: tasks?.active ?? null, examsThisWeek: counts.examsNext7Days, today })
  const dateLine = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Hong_Kong" }).format(new Date())

  const tiles: StatTile[] = [
    ...(students ? [
      { label: "Active students", value: counts.activeStudents, href: counts.activeStatusId ? `/students?status=${counts.activeStatusId}` : "/students", hint: "View active students", icon: Users },
      { label: "Open applications", value: counts.openApplications, href: "/students", hint: "Across all students", icon: FileText },
    ] : []),
    ...(scheduler ? [{ label: "Exams this week", value: counts.examsNext7Days, href: "/exams", hint: "Next 7 days", icon: ClipboardCheck }] : []),
    ...(events ? [{ label: "Upcoming events", value: counts.eventsNext30Days, href: "/events", hint: "Next 30 days", icon: CalendarDays }] : []),
  ]

  const actions: QuickStart[] = [
    ...(studentsWrite ? [{ label: "Add a student", description: "Start a new student profile", href: "/students/new", icon: UserPlus }] : []),
    ...(students ? [{ label: "Find a student", description: "Search by name or student code", href: "/students", icon: Users }] : []),
    ...(schoolsWrite ? [{ label: "Add a school", description: "Add a school to the directory", href: "/schools/new", icon: School }] : []),
    ...(eventsWrite ? [{ label: "Plan an event", description: "Expo, seminar, interview day and more", href: "/events", icon: CalendarDays }] : []),
    { label: "Add a task", description: "Your private to-do list", href: "/tasks", icon: ListTodo },
  ]

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold text-brand-navy sm:text-[2.75rem]">
            {greeting()}{user?.first_name ? `, ${user.first_name}` : ""}
          </h1>
          <p className="mt-1 text-base text-muted-foreground">{dateLine}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {schedulerWrite && <ScheduleBookingButton label="New booking" variant="outline" size="default" />}
          {studentsWrite && (
            <Button asChild>
              <Link href="/students/new"><UserPlus className="h-4 w-4" /> Add student</Link>
            </Button>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <AttentionPanel items={attention} />
        {scheduler ? <TodayPanel bookings={myDay} /> : <QuickStartPanel actions={actions} />}
      </div>

      <StatTiles tiles={tiles} />

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <RecentActivityPanel entries={activity} />
        {scheduler && <QuickStartPanel actions={actions} />}
      </div>
    </div>
  )
}
