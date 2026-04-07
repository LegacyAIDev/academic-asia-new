import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, Building2, Users, Sparkles } from "lucide-react"
import type { EventListItem } from "@/lib/supabase/queries/events"
import { URL_TO_TYPE_CODE } from "@/lib/supabase/queries/events"

const TYPE_CODE_TO_URL = Object.fromEntries(
  Object.entries(URL_TO_TYPE_CODE).map(([slug, code]) => [code, slug])
)

export function UpcomingEventCard({ event }: { event: EventListItem }) {
  const typeCode = event.event_type?.code ?? ""
  const slug = TYPE_CODE_TO_URL[typeCode] ?? "interview"
  const typeLabel = event.event_type?.label ?? "Event"

  const formatDate = (d: string | null) => {
    if (!d) return "TBD"
    return new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
  }
  const formatTime = (t: string | null) => t?.slice(0, 5) ?? ""

  const daysUntil = event.start_date
    ? Math.ceil((new Date(event.start_date).getTime() - Date.now()) / 86400000)
    : null

  return (
    <Link href={`/events/${slug}/${event.id}`} className="group block">
      <Card className="border shadow-none transition-all duration-200 hover:shadow-md hover:border-primary/30 h-full">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs font-medium">{typeLabel}</Badge>
            {daysUntil !== null && daysUntil >= 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {daysUntil === 0 ? (
                  <><Sparkles className="h-3 w-3 text-amber-500" /> Today</>
                ) : daysUntil === 1 ? "Tomorrow" : `In ${daysUntil} days`}
              </span>
            )}
          </div>

          <h3 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {event.name}
          </h3>

          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>{formatDate(event.start_date)}</span>
              {event.end_date && event.end_date !== event.start_date && (
                <span>- {formatDate(event.end_date)}</span>
              )}
            </div>
            {event.start_time && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 shrink-0" />
                <span>{formatTime(event.start_time)}{event.end_time ? ` - ${formatTime(event.end_time)}` : ""}</span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pt-1 border-t border-border/50">
            {event.school_count > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" /> {event.school_count}
              </span>
            )}
            {event.schedule_count > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" /> {event.schedule_count} slots
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
