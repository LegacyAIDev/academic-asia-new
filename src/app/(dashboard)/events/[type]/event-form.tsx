"use client"

import { useState, useTransition, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Save, Loader2 } from "lucide-react"
import { createEvent, updateEvent, type CreateEventInput } from "@/lib/supabase/actions/events"
import { saveEventSubItems } from "./event-form-save-sub-items"
import type { EventFormReferenceData, EventData } from "./event-form-types"
import { EventFormBasicSection } from "./event-form-basic-section"
import { EventFormDateTimeSection } from "./event-form-datetime-section"
import { EventFormLocationSection } from "./event-form-location-section"
import { EventFormSchoolsSection } from "./event-form-schools-section"
import { EventFormAdmissionSection } from "./event-form-admission-section"
import { EventFormRepresentatives, type RepresentativeRow } from "./event-form-representatives"
import { EventFormExamBlocks, type ExamBlockRow } from "./event-form-exam-blocks"
import { EventFormRemarksSection } from "./event-form-remarks-section"
import { getContactsForSchools, type SchoolContactOption } from "@/lib/supabase/actions/school-contacts"

export type EventFormProps = {
  mode: "create" | "edit"
  eventType: string
  event?: EventData | null
  referenceData: EventFormReferenceData
  /** Pre-loaded school IDs for E&G events in edit mode */
  existingSchoolIds?: string[]
}

export function EventForm({ mode, eventType, event, referenceData, existingSchoolIds = [] }: EventFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Controlled state for conditional rendering
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(event?.category_id ?? null)
  const [selectedDeliveryModeId, setSelectedDeliveryModeId] = useState<number | null>(event?.delivery_mode_id ?? null)
  const [selectedSchedulingModeId, setSelectedSchedulingModeId] = useState<number | null>(event?.scheduling_mode_id ?? null)

  // E&G: multi-select schools
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>(existingSchoolIds)

  // A&A: single school for admission events
  const [admissionSchoolId, setAdmissionSchoolId] = useState<string | null>(event?.school_id ?? null)

  // A&A: repeatable sub-forms
  const [representatives, setRepresentatives] = useState<RepresentativeRow[]>([])
  const [examBlocks, setExamBlocks] = useState<ExamBlockRow[]>([])

  // School contacts for representative dropdown — combines engagement multi-select + admission single school
  const [schoolContacts, setSchoolContacts] = useState<SchoolContactOption[]>([])
  useEffect(() => {
    const allSchoolIds = [...new Set([...selectedSchoolIds, ...(admissionSchoolId ? [admissionSchoolId] : [])])]
    if (allSchoolIds.length > 0) {
      getContactsForSchools(allSchoolIds).then(setSchoolContacts)
    } else {
      setSchoolContacts([])
    }
  }, [selectedSchoolIds, admissionSchoolId])

  // Derive conditions from reference data lookups
  const deliveryModeCode = referenceData.deliveryModes.find((d) => d.id === selectedDeliveryModeId)?.code
  const schedulingModeCode = referenceData.schedulingModes.find((s) => s.id === selectedSchedulingModeId)?.code
  const categoryCode = referenceData.categories.find((c) => c.id === selectedCategoryId)?.code

  const isEngagement = categoryCode === "engagement_guidance"
  const isAdmission = categoryCode === "admission_assessment"
  const showOnlineLink = deliveryModeCode === "online" || deliveryModeCode === "hybrid"
  const showRepresentatives = isAdmission && schedulingModeCode === "one_to_one"
  const showExamBlocks = isAdmission && schedulingModeCode === "group_sitting"

  const handleSchedulingModeChange = (id: number) => {
    setSelectedSchedulingModeId(id)
    const code = referenceData.schedulingModes.find((s) => s.id === id)?.code
    if (code === "group_sitting" && examBlocks.length === 0) {
      setExamBlocks([{ subject: "", name: "", apply_year: "", duration_minutes: "", start_time: "", end_time: "", venue_room: "", invigilator_names: "", capacity: "", allowed_items: "", special_instructions: "" }])
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const fd = new FormData(e.currentTarget)
    const str = (name: string) => { const v = (fd.get(name) as string); return (!v || v === "none") ? null : v }
    const int = (name: string) => fd.get(name) ? parseInt(fd.get(name) as string, 10) : null
    const assignedTo = str("assigned_to")

    const input: CreateEventInput = {
      event_type_id: int("event_type_id")!,
      name: fd.get("name") as string,
      category_id: selectedCategoryId,
      delivery_mode_id: int("delivery_mode_id"),
      visibility_id: int("visibility_id"),
      scheduling_mode_id: isAdmission ? int("scheduling_mode_id") : null,
      school_id: isAdmission ? str("school_id") : null,
      parent_event_id: isAdmission ? str("parent_event_id") : null,
      location: str("location"),
      online_link: showOnlineLink ? str("online_link") : null,
      capacity: int("capacity"),
      start_date: str("start_date"),
      end_date: str("end_date"),
      start_time: str("start_time"),
      end_time: str("end_time"),
      duration_minutes: int("duration_minutes"),
      remarks: str("remarks"),
      assigned_to: assignedTo === "unassigned" ? null : assignedTo,
    }

    startTransition(async () => {
      let result
      if (mode === "create") {
        result = await createEvent(input)
      } else if (event?.id) {
        result = await updateEvent(event.id, input)
      }

      if (!result?.success) {
        setError(result?.error ?? "An error occurred")
        return
      }

      const eventId = mode === "create" ? result.data?.id : event?.id
      if (!eventId) { setError("Missing event ID"); return }

      await saveEventSubItems({
        eventId, eventDate: input.start_date ?? null,
        isEngagement, showRepresentatives, showExamBlocks,
        selectedSchoolIds, representatives, examBlocks,
      })
      router.push(`/events/${eventType}/${eventId}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <EventFormBasicSection
        referenceData={referenceData}
        selectedCategoryId={selectedCategoryId}
        onCategoryChange={setSelectedCategoryId}
        onDeliveryModeChange={setSelectedDeliveryModeId}
        event={event}
      />

      <EventFormDateTimeSection event={event} />

      <EventFormLocationSection showOnlineLink={showOnlineLink} event={event} />

      {isEngagement && (
        <EventFormSchoolsSection
          schools={referenceData.schools}
          selectedSchoolIds={selectedSchoolIds}
          onSchoolsChange={setSelectedSchoolIds}
        />
      )}

      {isAdmission && (
        <EventFormAdmissionSection
          referenceData={referenceData}
          selectedSchedulingModeId={selectedSchedulingModeId}
          onSchedulingModeChange={handleSchedulingModeChange}
          selectedSchoolId={admissionSchoolId}
          onSchoolChange={setAdmissionSchoolId}
          event={event}
        />
      )}

      {showRepresentatives && (
        <EventFormRepresentatives
          representatives={representatives}
          onChange={setRepresentatives}
          schoolContacts={schoolContacts}
          eventStartTime={event?.start_time?.slice(0, 5) ?? ""}
          eventEndTime={event?.end_time?.slice(0, 5) ?? ""}
          eventDuration={event?.duration_minutes?.toString() ?? ""}
        />
      )}

      {showExamBlocks && (
        <EventFormExamBlocks examBlocks={examBlocks} onChange={setExamBlocks} profiles={referenceData.profiles} />
      )}

      <EventFormRemarksSection event={event} />

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        <Button variant="outline" type="button" asChild>
          <Link href={event?.id ? `/events/${eventType}/${event.id}` : `/events/${eventType}`}>
            Cancel
          </Link>
        </Button>
        <Button type="submit" disabled={isPending} className="gap-2">
          {isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" />{mode === "create" ? "Creating..." : "Saving..."}</>
          ) : (
            <><Save className="h-4 w-4" />{mode === "create" ? "Create Event" : "Save Changes"}</>
          )}
        </Button>
      </div>
    </form>
  )
}
