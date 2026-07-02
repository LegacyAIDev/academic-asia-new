import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, ChevronRight } from "lucide-react"
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

/** Read-only list of events this school participates in; links to each event. */
export function SchoolEventsSection({ events }: { events: SchoolEventItem[] }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          Events{events.length > 0 && ` (${events.length})`}
        </CardTitle>
      </CardHeader>
      <CardContent className={events.length === 0 ? "py-8" : "space-y-2"}>
        {events.length === 0 ? (
          <div className="text-center">
            <CalendarDays className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-foreground mb-1">No events yet</h3>
            <p className="text-sm text-muted-foreground">
              This school isn&apos;t linked to any events. Add it from an event&apos;s page.
            </p>
          </div>
        ) : (
          events.map((ev) => {
            const url = ev.event_type ? TYPE_CODE_TO_URL[ev.event_type.code as keyof typeof TYPE_CODE_TO_URL] : null
            const href = url ? `/events/${url}/${ev.id}` : `/events`
            return (
              <Link
                key={ev.id}
                href={href}
                className="group flex items-center gap-3 rounded-lg border border-border/50 bg-background p-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <CalendarDays className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{ev.name}</p>
                  <p className="text-xs text-muted-foreground">{formatRange(ev.start_date, ev.end_date)}</p>
                </div>
                {ev.event_type && (
                  <Badge variant="secondary" className="shrink-0 text-xs">{ev.event_type.label}</Badge>
                )}
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
