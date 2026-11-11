import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
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
  // The type whose page the user came from is filled in for them.
  const pageType = refData.eventTypes.find((t) => t.code === typeCode)
  const typeLabel = EVENT_TYPE_LABELS[typeCode]

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <Link href={`/events/${type}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> {typeLabel}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">{`Add ${typeLabel.toLowerCase()}`}</h1>
      <EventForm mode="create" eventType={type} referenceData={referenceData}
        defaultEventType={pageType ? { id: pageType.id, categoryId: pageType.category_id } : null} />
    </div>
  )
}
