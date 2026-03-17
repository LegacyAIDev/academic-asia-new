import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CalendarCheck,
  Building2,
  Users,
  Clock,
  MapPin,
} from "lucide-react"
import {
  getEventsList,
  getEventStats,
  URL_TO_TYPE_CODE,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_DESCRIPTIONS,
  type EventTypeCode,
  type EventListItem,
} from "@/lib/supabase/queries/events"
import { EventsFilters } from "./events-filters"
import { Skeleton } from "@/components/ui/skeleton"

type PageParams = {
  params: Promise<{ type: string }>
  searchParams: Promise<{
    page?: string
    search?: string
    date_from?: string
    date_to?: string
  }>
}

export default async function EventsListPage({ params, searchParams }: PageParams) {
  const { type } = await params
  const queryParams = await searchParams

  // Validate event type from URL
  const typeCode = URL_TO_TYPE_CODE[type]
  if (!typeCode) {
    notFound()
  }

  const page = parseInt(queryParams.page ?? "1", 10)
  const search = queryParams.search ?? ""
  const dateFrom = queryParams.date_from
  const dateTo = queryParams.date_to

  // Fetch events and stats in parallel
  const [eventsResult, stats] = await Promise.all([
    getEventsList({
      page,
      pageSize: 50,
      search,
      typeCode,
      dateFrom,
      dateTo,
    }),
    getEventStats(typeCode),
  ])

  const { events, totalCount, totalPages } = eventsResult
  const label = EVENT_TYPE_LABELS[typeCode]
  const description = EVENT_TYPE_DESCRIPTIONS[typeCode]

  // Type-specific stat cards
  const statCards = getStatCardsForType(typeCode, stats, events)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{label}</h1>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <Button className="gap-2 shadow-sm" asChild>
          <Link href={`/events/${type}/new`}>
            <Plus className="h-4 w-4" />
            Add Event
          </Link>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.iconBg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b bg-muted/30 px-6 py-4">
          <Suspense fallback={<Skeleton className="h-9 w-full max-w-md" />}>
            <EventsFilters eventType={type} />
          </Suspense>
        </CardHeader>

        <CardContent className="p-0">
          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b bg-muted/20">
                <TableHead className="font-medium pl-6">Event</TableHead>
                <TableHead className="font-medium">Location</TableHead>
                <TableHead className="font-medium">Date</TableHead>
                <TableHead className="font-medium">Time</TableHead>
                <TableHead className="font-medium">Schools</TableHead>
                <TableHead className="font-medium">Schedules</TableHead>
                <TableHead className="w-12 pr-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No events found. Try adjusting your filters.
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => (
                  <EventRow key={event.id} event={event} eventType={type} />
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t px-6 py-4">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium">{events.length}</span> of{" "}
              <span className="font-medium">{totalCount.toLocaleString()}</span> events
            </p>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              eventType={type}
              searchParams={queryParams}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function EventRow({ event, eventType }: { event: EventListItem; eventType: string }) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "—"
    return timeStr.slice(0, 5)
  }

  const isUpcoming = event.start_date && new Date(event.start_date) >= new Date()

  return (
    <TableRow className="group cursor-pointer">
      <TableCell className="pl-6">
        <div>
          <Link
            href={`/events/${eventType}/${event.id}`}
            className="font-medium text-foreground hover:text-primary transition-colors"
          >
            {event.name}
          </Link>
          {event.legacy_id && (
            <p className="text-xs text-muted-foreground">
              ID: {event.legacy_id}
            </p>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5 text-sm">
          {event.location ? (
            <>
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate max-w-[180px]">{event.location}</span>
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          <p className="text-foreground">{formatDate(event.start_date)}</p>
          {event.end_date && event.end_date !== event.start_date && (
            <p className="text-xs text-muted-foreground">to {formatDate(event.end_date)}</p>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          {event.start_time ? (
            <>
              <p className="text-foreground">{formatTime(event.start_time)}</p>
              {event.end_time && (
                <p className="text-xs text-muted-foreground">to {formatTime(event.end_time)}</p>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="font-medium">
          {event.school_count} {event.school_count === 1 ? "school" : "schools"}
        </Badge>
      </TableCell>
      <TableCell>
        {event.schedule_count > 0 ? (
          <Badge variant="outline" className="font-medium">
            {event.schedule_count.toLocaleString()} slots
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="pr-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href={`/events/${eventType}/${event.id}`} className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/events/${eventType}/${event.id}/edit`} className="flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                Edit Event
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center gap-2 text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

type StatCard = {
  label: string
  value: string | number
  icon: React.ElementType
  iconBg: string
  iconColor: string
}

function getStatCardsForType(
  typeCode: EventTypeCode,
  stats: Awaited<ReturnType<typeof getEventStats>>,
  events: EventListItem[]
): StatCard[] {
  const baseStats: StatCard[] = [
    {
      label: "Total Events",
      value: stats.totalEvents.toLocaleString(),
      icon: Calendar,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "Upcoming",
      value: stats.upcomingEvents.toLocaleString(),
      icon: CalendarCheck,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
    },
    {
      label: "Schools",
      value: stats.totalSchools.toLocaleString(),
      icon: Building2,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-600",
    },
    {
      label: "Schedules",
      value: stats.totalSchedules.toLocaleString(),
      icon: Clock,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-600",
    },
  ]

  // Type-specific customizations
  if (typeCode === "interview" || typeCode === "audition_day" || typeCode === "group_entrance_exam" || typeCode === "school_assessment_scholarship") {
    baseStats[3] = {
      label: "Representatives",
      value: stats.totalRepresentatives.toLocaleString(),
      icon: Users,
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-600",
    }
  }

  return baseStats
}

type PaginationProps = {
  currentPage: number
  totalPages: number
  eventType: string
  searchParams: Record<string, string | undefined>
}

function Pagination({ currentPage, totalPages, eventType, searchParams }: PaginationProps) {
  const createPageUrl = (page: number) => {
    const params = new URLSearchParams()
    if (searchParams.search) params.set("search", searchParams.search)
    if (searchParams.date_from) params.set("date_from", searchParams.date_from)
    if (searchParams.date_to) params.set("date_to", searchParams.date_to)
    params.set("page", page.toString())
    return `/events/${eventType}?${params.toString()}`
  }

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = []

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push("ellipsis")

      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) pages.push(i)

      if (currentPage < totalPages - 2) pages.push("ellipsis")
      pages.push(totalPages)
    }

    return pages
  }

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage <= 1}
        className="gap-1"
        asChild={currentPage > 1}
      >
        {currentPage > 1 ? (
          <Link href={createPageUrl(currentPage - 1)}>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Link>
        ) : (
          <>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </>
        )}
      </Button>
      <div className="flex items-center gap-1">
        {getPageNumbers().map((pageNum, idx) =>
          pageNum === "ellipsis" ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
              ...
            </span>
          ) : (
            <Button
              key={pageNum}
              variant={currentPage === pageNum ? "default" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              asChild={currentPage !== pageNum}
            >
              {currentPage === pageNum ? (
                pageNum
              ) : (
                <Link href={createPageUrl(pageNum)}>{pageNum}</Link>
              )}
            </Button>
          )
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage >= totalPages}
        className="gap-1"
        asChild={currentPage < totalPages}
      >
        {currentPage < totalPages ? (
          <Link href={createPageUrl(currentPage + 1)}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <>
            Next
            <ChevronRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  )
}
