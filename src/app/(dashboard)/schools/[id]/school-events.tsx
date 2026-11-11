import Link from "next/link"
import { Panel, PanelEmpty } from "@/components/ui/panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"
import { TYPE_CODE_TO_URL, type SchoolEventItem } from "@/lib/supabase/queries/events"

function formatRange(start: string | null, end: string | null) {
  const fmt = (s: string) => {
    try {
      return new Date(s + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    } catch { return s }
  }
  if (!start && !end) return "Date TBC"
  if (start && end && start !== end) return `${fmt(start)} – ${fmt(end)}`
  return fmt((start ?? end)!)
}

/** Read-only list of events this school takes part in; each opens its event. */
export function SchoolEventsSection({ events }: { events: SchoolEventItem[] }) {
  if (events.length === 0) {
    return (
      <Panel title="Events">
        <PanelEmpty title="No events yet" action={<Button asChild variant="outline" size="sm" className="h-8"><Link href="/events">Go to events</Link></Button>}>
          This school isn&apos;t linked to any events. Add the school from an event&apos;s page.
        </PanelEmpty>
      </Panel>
    )
  }
  return (
    <Panel title="Events" count={events.length} flush>
      <ul className="divide-y">
        {events.map(ev => {
          const url = ev.event_type ? TYPE_CODE_TO_URL[ev.event_type.code as keyof typeof TYPE_CODE_TO_URL] : null
          return (
            <li key={ev.id}>
              <Link href={url ? `/events/${url}/${ev.id}` : "/events"} className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium group-hover:text-brand-navy">{ev.name}</span>
                  <span className="block text-xs text-muted-foreground">{formatRange(ev.start_date, ev.end_date)}</span>
                </span>
                {ev.event_type && <Badge variant="secondary" className="shrink-0 text-xs">{ev.event_type.label}</Badge>}
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
