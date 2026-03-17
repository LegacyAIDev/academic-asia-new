import Link from "next/link"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  ArrowLeft,
  Edit,
  Calendar,
  Clock,
  MapPin,
  Building2,
  Users,
  CalendarDays,
  FileText,
  User,
  Trash2,
} from "lucide-react"
import {
  getEventById,
  getEventSchools,
  getEventRepresentatives,
  URL_TO_TYPE_CODE,
  EVENT_TYPE_LABELS,
} from "@/lib/supabase/queries/events"
import { DeleteEventDialog } from "./delete-event-dialog"

type EventDetailPageParams = {
  params: Promise<{ type: string; id: string }>
}

export default async function EventDetailPage({ params }: EventDetailPageParams) {
  const { type, id } = await params

  // Validate event type
  const typeCode = URL_TO_TYPE_CODE[type]
  if (!typeCode) {
    notFound()
  }

  // Fetch event data and related records in parallel
  const [event, schools, representatives] = await Promise.all([
    getEventById(id),
    getEventSchools(id),
    getEventRepresentatives(id),
  ])

  if (!event) {
    notFound()
  }

  const typeLabel = EVENT_TYPE_LABELS[typeCode]

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "—"
    return timeStr.slice(0, 5)
  }

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const isUpcoming = event.start_date && new Date(event.start_date) >= new Date()

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/events/${type}`}>{typeLabel}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{event.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild className="mt-1">
            <Link href={`/events/${type}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-sm">
            <Calendar className="h-7 w-7 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">{event.name}</h1>
              <Badge
                variant="outline"
                className={
                  isUpcoming
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }
              >
                {isUpcoming ? "Upcoming" : "Past"}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
              {event.legacy_id && (
                <code className="font-mono bg-muted px-2 py-0.5 rounded text-xs">
                  ID: {event.legacy_id}
                </code>
              )}
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDate(event.start_date)}
              </span>
              {event.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {event.location}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button className="gap-2 shadow-sm" asChild>
            <Link href={`/events/${type}/${id}/edit`}>
              <Edit className="h-4 w-4" />
              Edit Event
            </Link>
          </Button>
          <DeleteEventDialog eventId={id} eventName={event.name} eventType={type} />
        </div>
      </div>

      {/* Tabs Content */}
      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="basic" className="gap-2">
            <FileText className="h-4 w-4" />
            Basic Info
          </TabsTrigger>
          <TabsTrigger value="schools" className="gap-2">
            <Building2 className="h-4 w-4" />
            Schools ({schools.length})
          </TabsTrigger>
          <TabsTrigger value="representatives" className="gap-2">
            <Users className="h-4 w-4" />
            Representatives ({representatives.length})
          </TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="basic" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Event Details */}
            <Card className="lg:col-span-2 border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Event Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Event Name</p>
                  <p className="text-sm font-medium">{event.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Event Type</p>
                  <p className="text-sm font-medium">{event.event_type?.label ?? "—"}</p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Location / Description</p>
                  <p className="text-sm font-medium flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    {event.location || "—"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-medium">Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Schools</span>
                  <Badge variant="secondary">{schools.length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Representatives</span>
                  <Badge variant="secondary">{representatives.length}</Badge>
                </div>
                {event.duration_minutes && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Duration</span>
                    <span className="text-sm font-medium">{event.duration_minutes} min</span>
                  </div>
                )}
                {event.assigned_to_profile && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Assigned To</span>
                    <span className="text-sm font-medium">
                      {event.assigned_to_profile.first_name} {event.assigned_to_profile.surname}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Date & Time */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Date & Time
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Start Date</p>
                <p className="text-sm font-medium">{formatDate(event.start_date)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">End Date</p>
                <p className="text-sm font-medium">{formatDate(event.end_date)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Start Time</p>
                <p className="text-sm font-medium">{formatTime(event.start_time)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">End Time</p>
                <p className="text-sm font-medium">{formatTime(event.end_time)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Remarks */}
          {event.remarks && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Remarks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.remarks}</p>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card className="border-0 shadow-sm bg-muted/30">
            <CardContent className="py-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Created: {formatDateTime(event.created_at)}</span>
                <span>Last Updated: {formatDateTime(event.updated_at)}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schools Tab */}
        <TabsContent value="schools" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Participating Schools
              </CardTitle>
              <Button size="sm" variant="outline" disabled>
                Add School
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {schools.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  No schools added to this event yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/20">
                      <TableHead className="font-medium">School</TableHead>
                      <TableHead className="font-medium">Location</TableHead>
                      <TableHead className="font-medium">Confirmed</TableHead>
                      <TableHead className="font-medium">Deadline</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schools.map((es) => (
                      <TableRow key={es.id}>
                        <TableCell>
                          <Link
                            href={`/schools/${es.school?.id}`}
                            className="font-medium text-foreground hover:text-primary transition-colors"
                          >
                            {es.school?.name ?? "Unknown School"}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {es.school?.city ?? "—"}
                          {es.school?.country?.label && `, ${es.school.country.label}`}
                        </TableCell>
                        <TableCell>
                          <Badge variant={es.is_confirmed ? "default" : "secondary"}>
                            {es.is_confirmed ? "Confirmed" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {es.application_deadline
                            ? new Date(es.application_deadline).toLocaleDateString("en-GB")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Representatives Tab */}
        <TabsContent value="representatives" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                School Representatives
              </CardTitle>
              <Button size="sm" variant="outline" disabled>
                Add Representative
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {representatives.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  No representatives added to this event yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/20">
                      <TableHead className="font-medium">Representative Name</TableHead>
                      <TableHead className="font-medium">School</TableHead>
                      <TableHead className="font-medium">Remarks</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {representatives.map((representative) => (
                      <TableRow key={representative.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{representative.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {representative.school?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">
                          {representative.remarks ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
