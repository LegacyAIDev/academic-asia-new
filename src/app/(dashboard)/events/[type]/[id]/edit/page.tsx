import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ArrowLeft } from "lucide-react"
import {
  getEventById, getEventSchools, getStaffProfiles, URL_TO_TYPE_CODE, EVENT_TYPE_LABELS,
} from "@/lib/supabase/queries/events"
import { getEventFormReferenceData } from "@/lib/supabase/queries/event-reference-queries"
import { EventForm } from "../../event-form"
import type { EventData } from "../../event-form-types"

type EditEventPageParams = {
  params: Promise<{ type: string; id: string }>
}

export default async function EditEventPage({ params }: EditEventPageParams) {
  const { type, id } = await params
  const typeCode = URL_TO_TYPE_CODE[type]
  if (!typeCode) notFound()

  const [event, refData, profiles, eventSchools] = await Promise.all([
    getEventById(id),
    getEventFormReferenceData(id),
    getStaffProfiles(),
    getEventSchools(id),
  ])

  if (!event) notFound()

  const referenceData = { ...refData, profiles }
  const typeLabel = EVENT_TYPE_LABELS[typeCode]

  // Map full event to form-compatible shape
  const eventData: EventData = {
    id: event.id,
    event_type_id: event.event_type_id,
    category_id: event.category_id,
    parent_event_id: event.parent_event_id,
    delivery_mode_id: event.delivery_mode_id,
    visibility_id: event.visibility_id,
    scheduling_mode_id: event.scheduling_mode_id,
    school_id: event.school_id,
    name: event.name,
    location: event.location,
    online_link: event.online_link,
    capacity: event.capacity,
    start_date: event.start_date,
    end_date: event.end_date,
    start_time: event.start_time,
    end_time: event.end_time,
    duration_minutes: event.duration_minutes,
    remarks: event.remarks,
    assigned_to: event.assigned_to,
  }

  // Existing school IDs for E&G multi-select
  const existingSchoolIds = eventSchools.map((es: { school_id: string }) => es.school_id)

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href={`/events/${type}`}>{typeLabel}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href={`/events/${type}/${id}`}>{event.name}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Edit</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/events/${type}/${id}`}><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit Event</h1>
          <p className="text-sm text-muted-foreground mt-1">Update {event.name}</p>
        </div>
      </div>

      <EventForm
        mode="edit"
        eventType={type}
        event={eventData}
        referenceData={referenceData}
        existingSchoolIds={existingSchoolIds}
      />
    </div>
  )
}
