import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ArrowLeft } from "lucide-react"
import { URL_TO_TYPE_CODE, EVENT_TYPE_LABELS } from "@/lib/supabase/queries/events"
import { getEventFormReferenceData } from "@/lib/supabase/queries/event-reference-queries"
import { getStaffProfiles } from "@/lib/supabase/queries/events"
import { EventForm } from "../event-form"
import { requireAccess } from "@/lib/permissions/guard"
import { ACCESS, MODULES } from "@/lib/permissions/modules"

type NewEventPageParams = {
  params: Promise<{ type: string }>
}

export default async function NewEventPage({ params }: NewEventPageParams) {
  await requireAccess(MODULES.EVENTS, ACCESS.WRITE)

  const { type } = await params
  const typeCode = URL_TO_TYPE_CODE[type]
  if (!typeCode) notFound()

  const [refData, profiles] = await Promise.all([
    getEventFormReferenceData(),
    getStaffProfiles(),
  ])

  const referenceData = { ...refData, profiles }
  const typeLabel = EVENT_TYPE_LABELS[typeCode]

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href={`/events/${type}`}>{typeLabel}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>New Event</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/events/${type}`}><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Add New Event</h1>
          <p className="text-sm text-muted-foreground mt-1">Create a new {typeLabel.toLowerCase()} in the system</p>
        </div>
      </div>

      <EventForm mode="create" eventType={type} referenceData={referenceData} />
    </div>
  )
}
