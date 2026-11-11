import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ChevronLeft, Eye, MoreHorizontal, Pencil, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getEventsList, URL_TO_TYPE_CODE, EVENT_TYPE_LABELS, EVENT_TYPE_DESCRIPTIONS, type EventListItem } from "@/lib/supabase/queries/events"
import { studentsListHref } from "@/lib/students/list-url"
import { hkToday } from "@/lib/hk-day"
import { canAccess, requireAccess } from "@/lib/permissions/guard"
import { ACCESS, MODULES } from "@/lib/permissions/modules"
import { EventsFilters } from "./events-filters"

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
  await requireAccess(MODULES.EVENTS)

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

  const [{ events, totalCount, totalPages }, canWrite] = await Promise.all([
    getEventsList({ page, pageSize: 50, search, typeCode, dateFrom, dateTo, sortBy: "start_date", sortOrder: "desc" }),
    canAccess(MODULES.EVENTS, ACCESS.WRITE),
  ])
  const label = EVENT_TYPE_LABELS[typeCode]
  const description = EVENT_TYPE_DESCRIPTIONS[typeCode]
  const today = hkToday()
  const href = (changes: Record<string, string | null>) => studentsListHref(queryParams as Record<string, string | undefined>, changes, `/events/${type}`)
  const showSlots = events.some(e => e.schedule_count > 0)
  const filtered = Boolean(search || dateFrom || dateTo)

  return (
    <div className="mx-auto max-w-[1320px] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/events" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" /> All events</Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-brand-navy">{label}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}. {totalCount.toLocaleString("en-GB")} {filtered ? "matching" : "in total"}, newest first.</p>
        </div>
        {canWrite && (
          <Button className="gap-2" asChild>
            <Link href={`/events/${type}/new`}><Plus className="h-4 w-4" /> Add {label.toLowerCase()}</Link>
          </Button>
        )}
      </header>

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="border-b px-4 py-3 sm:px-5">
          <Suspense fallback={<Skeleton className="h-9 w-full max-w-md" />}>
            <EventsFilters eventType={type} />
          </Suspense>
        </div>
        {events.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <p className="font-medium">{filtered ? "No events match" : "No events yet"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{filtered ? "Try other dates or words." : `Add the first ${label.toLowerCase()} with the button above.`}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4 sm:pl-5">Event</TableHead>
                <TableHead>Date and time</TableHead>
                <TableHead className="hidden md:table-cell">Where</TableHead>
                <TableHead className="hidden lg:table-cell">Schools</TableHead>
                {showSlots && <TableHead className="hidden lg:table-cell">Sessions</TableHead>}
                <TableHead className="w-12 pr-4"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map(event => <EventRow key={event.id} event={event} eventType={type} today={today} showSlots={showSlots} canWrite={canWrite} />)}
            </TableBody>
          </Table>
        )}
        {totalPages > 1 && (
          <footer className="flex items-center justify-between border-t px-4 py-3 sm:px-5">
            <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
                {page > 1 ? <Link href={href({ page: String(page - 1) })}>Previous</Link> : <span>Previous</span>}
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} asChild={page < totalPages}>
                {page < totalPages ? <Link href={href({ page: String(page + 1) })}>Next</Link> : <span>Next</span>}
              </Button>
            </div>
          </footer>
        )}
      </section>
    </div>
  )
}

const fmtDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })

function EventRow({ event, eventType, today, showSlots, canWrite }: { event: EventListItem; eventType: string; today: string; showSlots: boolean; canWrite: boolean }) {
  const href = `/events/${eventType}/${event.id}`
  const past = Boolean(event.start_date) && (event.end_date ?? event.start_date)! < today
  const time = [event.start_time?.slice(0, 5), event.end_time?.slice(0, 5)].filter(Boolean).join(" to ")
  return (
    // The name link stretches over the row, so anywhere on it opens the event.
    <TableRow className={`group relative ${past ? "text-muted-foreground" : ""}`}>
      <TableCell className="py-3 pl-4 sm:pl-5">
        <Link href={href} className="font-medium text-foreground after:absolute after:inset-0 after:content-[''] group-hover:text-brand-navy">{event.name}</Link>
        {past && <p className="text-xs">Past</p>}
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm">
        {event.start_date ? fmtDate(event.start_date) : "Date to be set"}
        {event.end_date && event.end_date !== event.start_date && <p className="text-xs text-muted-foreground">to {fmtDate(event.end_date)}</p>}
        {time && <p className="text-xs text-muted-foreground">{time}</p>}
      </TableCell>
      <TableCell className="hidden max-w-[320px] text-sm md:table-cell">{event.location || <span className="text-muted-foreground/60">—</span>}</TableCell>
      <TableCell className="hidden text-sm tabular-nums lg:table-cell">{event.school_count || <span className="text-muted-foreground/60">—</span>}</TableCell>
      {showSlots && <TableCell className="hidden text-sm tabular-nums lg:table-cell">{event.schedule_count || ""}</TableCell>}
      <TableCell className="relative z-10 pr-4 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label={`Actions for ${event.name}`}><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem asChild><Link href={href}><Eye className="h-4 w-4" /> Open event</Link></DropdownMenuItem>
            {canWrite && <DropdownMenuItem asChild><Link href={`${href}/edit`}><Pencil className="h-4 w-4" /> Edit details</Link></DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
