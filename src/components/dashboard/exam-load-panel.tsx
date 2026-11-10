import Link from "next/link"
import type { ExamDay } from "@/lib/supabase/queries/dashboard"
import { DashboardPanel } from "./dashboard-panel"

const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" })
const longDay = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })

/**
 * Exam bookings for the next two weeks, a column per day: navy for confirmed,
 * gold for still waiting on confirmation. Each day opens that day's rooms.
 */
export function ExamLoadPanel({ days }: { days: ExamDay[] | null }) {
  const busiest = Math.max(1, ...(days ?? []).map(d => d.confirmed + d.pending))
  const waiting = (days ?? []).reduce((sum, d) => sum + d.pending, 0)

  return (
    <DashboardPanel title="Exams, next 14 days" link={{ href: "/exams", label: "Open exam desk" }}>
      {days === null ? (
        <p className="text-sm text-muted-foreground">Exam bookings could not be loaded.</p>
      ) : (
        <>
          <ol className="mt-1 grid grid-cols-7 gap-1.5 sm:grid-cols-[repeat(14,minmax(0,1fr))]">
            {days.map((d, i) => {
              const total = d.confirmed + d.pending
              const date = new Date(`${d.day}T00:00:00Z`)
              const label = `${longDay.format(date)}: ${total === 0 ? "no exams" : `${d.confirmed} confirmed, ${d.pending} awaiting confirmation`}`
              return (
                <li key={d.day} className={i >= 7 ? "hidden sm:block" : undefined}>
                  <Link
                    href={`/scheduler?view=rooms&mode=day&types=examination,group_examination&date=${d.day}`}
                    aria-label={label}
                    title={label}
                    className="group flex flex-col items-center rounded-md px-0.5 pb-1.5 pt-1 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="h-5 text-xs font-medium tabular-nums text-foreground">{total || ""}</span>
                    <span className="flex h-24 w-full max-w-8 flex-col justify-end overflow-hidden rounded-sm bg-muted/50" aria-hidden="true">
                      <span className="block bg-brand-gold" style={{ height: `${(d.pending / busiest) * 100}%` }} />
                      <span className="block bg-brand-navy" style={{ height: `${(d.confirmed / busiest) * 100}%` }} />
                    </span>
                    <span className={i === 0 ? "mt-2 text-xs font-semibold text-brand-navy" : "mt-2 text-xs text-muted-foreground"}>
                      {i === 0 ? "Today" : weekday.format(date)}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">{date.getUTCDate()}</span>
                  </Link>
                </li>
              )
            })}
          </ol>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-brand-navy" aria-hidden="true" />Confirmed</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-brand-gold" aria-hidden="true" />Awaiting confirmation{waiting ? ` (${waiting})` : ""}</span>
          </div>
        </>
      )}
    </DashboardPanel>
  )
}
