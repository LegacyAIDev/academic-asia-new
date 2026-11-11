import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Panel, PanelEmpty } from "@/components/ui/panel"
import { getEventsList, EVENT_TYPE_LABELS, URL_TO_TYPE_CODE, type EventListItem } from "@/lib/supabase/queries/events"
import { canAccess, requireAccess } from "@/lib/permissions/guard"
import { ACCESS, MODULES } from "@/lib/permissions/modules"
import { hkToday } from "@/lib/hk-day"
import { cn } from "@/lib/utils"
import { AddEventMenu } from "./add-event-menu"

const TYPE_CODE_TO_URL = Object.fromEntries(Object.entries(URL_TO_TYPE_CODE).map(([slug, code]) => [code, slug])) as Record<string, string>

const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10)
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000)

/**
 * Every upcoming event in one list, soonest first, grouped by when it is, with
 * the categories as filters on this page and "Add event" by category.
 */
export default async function EventsOverviewPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  await requireAccess(MODULES.EVENTS)
  const today = hkToday()
  const { type } = await searchParams
  const typeCode = type ? URL_TO_TYPE_CODE[type] : undefined

  const [{ events }, canWrite] = await Promise.all([
    getEventsList({ pageSize: 200, dateFrom: today, sortBy: "start_date", sortOrder: "asc" }),
    canAccess(MODULES.EVENTS, ACCESS.WRITE),
  ])
  const counts = new Map<string, number>()
  for (const e of events) counts.set(e.event_type?.code ?? "", (counts.get(e.event_type?.code ?? "") ?? 0) + 1)
  const shown = typeCode ? events.filter(e => e.event_type?.code === typeCode) : events

  const weekEnd = addDays(today, 6)
  const monthEnd = addDays(today, 30)
  const groups = [
    { title: "Next 7 days", events: shown.filter(e => e.start_date && e.start_date <= weekEnd) },
    { title: "Next 30 days", events: shown.filter(e => e.start_date && e.start_date > weekEnd && e.start_date <= monthEnd) },
    { title: "Later", events: shown.filter(e => !e.start_date || e.start_date > monthEnd) },
  ].filter(g => g.events.length > 0)

  return (
    <div className="mx-auto max-w-[1320px] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {events.length} upcoming. Open a category for its full list, past events included.
          </p>
        </div>
        {canWrite && <AddEventMenu />}
      </header>

      <nav aria-label="Category" className="flex flex-wrap gap-1.5">
        {[[null, "All", events.length] as const, ...Object.entries(EVENT_TYPE_LABELS).map(([code, label]) => [TYPE_CODE_TO_URL[code], label, counts.get(code) ?? 0] as const)].map(([slug, label, count]) => {
          const current = (type ?? null) === slug
          return (
            <Link
              key={label}
              href={slug ? `/events?type=${slug}` : "/events"}
              aria-current={current ? "true" : undefined}
              className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors", current ? "border-brand-navy bg-brand-navy text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
            >
              {label}
              <span className={cn("tabular-nums", current ? "text-white/80" : "text-muted-foreground/70")}>{count}</span>
            </Link>
          )
        })}
      </nav>

      {groups.length === 0 ? (
        <Panel title="Upcoming events">
          <PanelEmpty title={typeCode ? `No upcoming ${EVENT_TYPE_LABELS[typeCode].toLowerCase()} events` : "No upcoming events"}>
            {typeCode ? <Link href={`/events/${type}`} className="text-brand-navy underline-offset-4 hover:underline">See past ones in the full list</Link> : "Add one with Add event."}
          </PanelEmpty>
        </Panel>
      ) : (
        groups.map(group => (
          <Panel key={group.title} title={group.title} count={group.events.length} flush>
            <ul className="divide-y">
              {group.events.map(event => <EventRow key={event.id} event={event} today={today} />)}
            </ul>
          </Panel>
        ))
      )}
    </div>
  )
}

/** One event as a row: date block, name and kind, time and place, and how soon. */
function EventRow({ event, today }: { event: EventListItem; today: string }) {
  const slug = TYPE_CODE_TO_URL[event.event_type?.code ?? ""] ?? "interview"
  const date = event.start_date ? new Date(`${event.start_date}T00:00:00Z`) : null
  const inDays = event.start_date ? daysBetween(today, event.start_date) : null
  const when = inDays === null ? "Date to be set" : inDays === 0 ? "Today" : inDays === 1 ? "Tomorrow" : `In ${inDays} days`
  const time = [event.start_time?.slice(0, 5), event.end_time?.slice(0, 5)].filter(Boolean).join(" to ")
  return (
    <li>
      <Link href={`/events/${slug}/${event.id}`} className="group flex items-center gap-4 px-4 py-3 hover:bg-muted/40">
        <span className="flex w-12 shrink-0 flex-col items-center rounded-md border py-1 text-brand-navy">
          <span className="text-[11px] font-medium">{date ? date.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }) : "TBC"}</span>
          <span className="text-lg font-semibold leading-tight tabular-nums">{date ? date.getUTCDate() : "–"}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium group-hover:text-brand-navy">{event.name}</span>
          <span className="block truncate text-sm text-muted-foreground">
            {[event.event_type?.label, time, event.location].filter(Boolean).join(", ")}
          </span>
        </span>
        <span className="hidden shrink-0 text-sm text-muted-foreground sm:block">{when}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
      </Link>
    </li>
  )
}
