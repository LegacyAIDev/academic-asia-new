import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Calendar, CalendarCheck, CalendarClock,
  Building2, Users, ArrowRight,
} from "lucide-react"
import {
  getEventsList,
  getEventStats,
  EVENT_TYPE_LABELS,
  URL_TO_TYPE_CODE,
  type EventListItem,
} from "@/lib/supabase/queries/events"
import { UpcomingEventCard } from "./upcoming-event-card"

const TYPE_CODE_TO_URL = Object.fromEntries(
  Object.entries(URL_TO_TYPE_CODE).map(([slug, code]) => [code, slug])
)

export default async function EventsOverviewPage() {
  const today = new Date().toISOString().split("T")[0]

  const [upcomingResult, stats] = await Promise.all([
    getEventsList({ pageSize: 20, dateFrom: today, sortBy: "start_date", sortOrder: "asc" }),
    getEventStats(),
  ])

  const { events } = upcomingResult

  // Group events: this week, this month, later
  const now = new Date()
  const endOfWeek = new Date(now)
  endOfWeek.setDate(now.getDate() + (7 - now.getDay()))
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const thisWeek = events.filter(e => e.start_date && new Date(e.start_date) <= endOfWeek)
  const thisMonth = events.filter(e => e.start_date && new Date(e.start_date) > endOfWeek && new Date(e.start_date) <= endOfMonth)
  const later = events.filter(e => e.start_date && new Date(e.start_date) > endOfMonth)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
        <p className="text-sm text-muted-foreground mt-1">Upcoming events across all categories</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Calendar} label="Total Events" value={stats.totalEvents} bg="bg-primary/10" color="text-primary" />
        <StatCard icon={CalendarCheck} label="Upcoming" value={stats.upcomingEvents} bg="bg-emerald-500/10" color="text-emerald-600" />
        <StatCard icon={Building2} label="Schools Involved" value={stats.totalSchools} bg="bg-blue-500/10" color="text-blue-600" />
        <StatCard icon={Users} label="Total Schedules" value={stats.totalSchedules} bg="bg-amber-500/10" color="text-amber-600" />
      </div>

      {/* Category Quick Links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(EVENT_TYPE_LABELS).map(([code, label]) => {
          const slug = TYPE_CODE_TO_URL[code]
          if (!slug) return null
          return (
            <Link key={code} href={`/events/${slug}`}
              className="group flex items-center justify-between rounded-lg border border-border/60 bg-card px-4 py-3 transition-all hover:border-primary/30 hover:shadow-sm">
              <span className="text-sm font-medium group-hover:text-primary transition-colors">{label}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
            </Link>
          )
        })}
      </div>

      {/* Upcoming Events */}
      {events.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-muted/80 to-muted/40">
              <CalendarClock className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <h3 className="mt-5 text-lg font-semibold tracking-tight">No upcoming events</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">All events are in the past or none have been created yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {thisWeek.length > 0 && <EventGroup label="This Week" events={thisWeek} accent="text-emerald-600" badge="bg-emerald-50 text-emerald-700 border-emerald-200" />}
          {thisMonth.length > 0 && <EventGroup label="This Month" events={thisMonth} accent="text-blue-600" badge="bg-blue-50 text-blue-700 border-blue-200" />}
          {later.length > 0 && <EventGroup label="Upcoming" events={later} accent="text-muted-foreground" badge="bg-muted text-muted-foreground border-border" />}
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, bg, color }: {
  icon: React.ElementType; label: string; value: number; bg: string; color: string
}) {
  return (
    <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
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

function EventGroup({ label, events, accent, badge }: {
  label: string; events: EventListItem[]; accent: string; badge: string
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className={`text-sm font-semibold uppercase tracking-wider ${accent}`}>{label}</h2>
        <Badge variant="outline" className={`text-xs ${badge}`}>{events.length}</Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => <UpcomingEventCard key={event.id} event={event} />)}
      </div>
    </div>
  )
}
