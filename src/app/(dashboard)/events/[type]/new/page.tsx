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
  getEventTypes,
  getStaffProfiles,
  getEventTypeIdByCode,
  URL_TO_TYPE_CODE,
  EVENT_TYPE_LABELS,
} from "@/lib/supabase/queries/events"
import { EventForm } from "../event-form"

type NewEventPageParams = {
  params: Promise<{ type: string }>
}

export default async function NewEventPage({ params }: NewEventPageParams) {
  const { type } = await params

  // Validate event type
  const typeCode = URL_TO_TYPE_CODE[type]
  if (!typeCode) {
    notFound()
  }

  // Fetch reference data
  const [eventTypes, profiles, eventTypeId] = await Promise.all([
    getEventTypes(),
    getStaffProfiles(),
    getEventTypeIdByCode(typeCode),
  ])

  if (!eventTypeId) {
    notFound()
  }

  const typeLabel = EVENT_TYPE_LABELS[typeCode]

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
            <BreadcrumbPage>New Event</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/events/${type}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Add New Event</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create a new {typeLabel.toLowerCase()} in the system
          </p>
        </div>
      </div>

      {/* Form */}
      <EventForm
        mode="create"
        eventType={type}
        eventTypeId={eventTypeId}
        eventTypes={eventTypes}
        profiles={profiles}
      />
    </div>
  )
}
