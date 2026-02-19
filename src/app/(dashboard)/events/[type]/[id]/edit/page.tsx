import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ArrowLeft } from "lucide-react"
import {
  getEventById,
  getEventTypes,
  getStaffProfiles,
  URL_TO_TYPE_CODE,
  EVENT_TYPE_LABELS,
} from "@/lib/supabase/queries/events"
import { EventForm } from "../../event-form"

type EditEventPageParams = {
  params: Promise<{ type: string; id: string }>
}

export default async function EditEventPage({ params }: EditEventPageParams) {
  const { type, id } = await params

  // Validate event type
  const typeCode = URL_TO_TYPE_CODE[type]
  if (!typeCode) {
    notFound()
  }

  // Fetch event and reference data in parallel
  const [event, eventTypes, profiles] = await Promise.all([
    getEventById(id),
    getEventTypes(),
    getStaffProfiles(),
  ])

  if (!event) {
    notFound()
  }

  const typeLabel = EVENT_TYPE_LABELS[typeCode]

  // Transform event data for the form
  const eventData = {
    id: event.id,
    event_type_id: event.event_type_id,
    name: event.name,
    location: event.location,
    start_date: event.start_date,
    end_date: event.end_date,
    start_time: event.start_time,
    end_time: event.end_time,
    duration_minutes: event.duration_minutes,
    remarks: event.remarks,
    assigned_to: event.assigned_to,
  }

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
            <BreadcrumbLink href={`/events/${type}/${id}`}>{event.name}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Edit</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/events/${type}/${id}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit Event</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Update {event.name}
          </p>
        </div>
      </div>

      {/* Form */}
      <EventForm
        mode="edit"
        eventType={type}
        eventTypeId={event.event_type_id}
        event={eventData}
        eventTypes={eventTypes}
        profiles={profiles}
      />
    </div>
  )
}
