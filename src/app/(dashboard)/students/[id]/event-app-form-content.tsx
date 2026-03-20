"use client"

import { useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { CalendarDays, ClipboardList, MessageSquare, MapPin, Users } from "lucide-react"
import type { EventAppReferenceData } from "./event-application-dialog"
import type { EventAppWithJoins } from "@/lib/supabase/queries/student-event-applications"
import { EventAppPiecesSection, type PieceEntry } from "./event-app-pieces-section"

type Props = {
  referenceData: EventAppReferenceData
  application?: EventAppWithJoins
  selectedEventTypeId: string
  onEventTypeChange: (val: string) => void
  selectedEventId: string
  onEventIdChange: (val: string) => void
  pieces: PieceEntry[]
  onPiecesChange: (pieces: PieceEntry[]) => void
}

const selectStyles = "h-10 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
const inputStyles = "h-10 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"

function Section({ icon: Icon, title, children, accent = "primary" }: {
  icon: React.ElementType; title: string; children: React.ReactNode
  accent?: "primary" | "teal" | "amber" | "rose"
}) {
  const styles = {
    primary: "from-primary/20 to-primary/5 text-primary",
    teal: "from-teal-500/20 to-teal-500/5 text-teal-600",
    amber: "from-amber-500/20 to-amber-500/5 text-amber-600",
    rose: "from-rose-500/20 to-rose-500/5 text-rose-600",
  }
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${styles[accent]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

/** Form fields for event application — rendered inside the dialog */
export function EventAppFormContent({
  referenceData, application,
  selectedEventTypeId, onEventTypeChange,
  selectedEventId, onEventIdChange,
  pieces, onPiecesChange,
}: Props) {
  const { eventTypes, events, statuses, representatives } = referenceData

  // Filter events by type
  const filteredEvents = useMemo(() => {
    if (!selectedEventTypeId) return events
    return events.filter((e) => e.event_type_id === parseInt(selectedEventTypeId, 10))
  }, [selectedEventTypeId, events])

  // Selected event details for auto-fill
  const selectedEvent = useMemo(() =>
    events.find((e) => e.id === selectedEventId) ?? null
  , [selectedEventId, events])

  // Event type info for conditional rendering
  const eventType = useMemo(() =>
    selectedEvent ? eventTypes.find((et) => et.id === selectedEvent.event_type_id) : null
  , [selectedEvent, eventTypes])

  const isAA = eventType?.category_id === 2
  const isAudition = eventType?.code === "audition_day"
  const hasCapacity = selectedEvent?.capacity != null && selectedEvent.capacity > 0

  // Representatives for this event
  const eventReps = useMemo(() =>
    representatives.filter((r) => r.event_id === selectedEventId)
  , [selectedEventId, representatives])

  const formatDate = (d: string | null) =>
    d ? new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"

  const formatTimeRange = (start: string | null, end: string | null) => {
    if (!start) return "—"
    return end ? `${start} – ${end}` : start
  }

  return (
    <div className="space-y-5">
      {/* Event Selection */}
      <Section icon={CalendarDays} title="Event Selection">
        <Field label="Event Type (filter)">
          <Select value={selectedEventTypeId || "__all__"} onValueChange={(v) => onEventTypeChange(v === "__all__" ? "" : v)}>
            <SelectTrigger className={selectStyles}><SelectValue placeholder="All event types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All event types</SelectItem>
              {eventTypes.map((et) => <SelectItem key={et.id} value={et.id.toString()}>{et.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Event *">
          <Select name="event_id" value={selectedEventId} onValueChange={onEventIdChange}>
            <SelectTrigger className={selectStyles}><SelectValue placeholder="Select event" /></SelectTrigger>
            <SelectContent className="max-h-60">
              {filteredEvents.map((ev) => <SelectItem key={ev.id} value={ev.id}>{ev.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Status">
          <Select name="status_id" defaultValue={application?.status_id?.toString() ?? "1"}>
            <SelectTrigger className={selectStyles}><SelectValue /></SelectTrigger>
            <SelectContent>
              {statuses.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </Section>

      {/* Auto-fill from Event */}
      {selectedEvent && (
        <Section icon={MapPin} title="Event Details" accent="teal">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <p className="text-sm font-medium py-2">{formatDate(selectedEvent.start_date)}</p>
            </Field>
            <Field label="Timeslot">
              <p className="text-sm font-medium py-2">{formatTimeRange(selectedEvent.start_time, selectedEvent.end_time)}</p>
            </Field>
          </div>
          {selectedEvent.school && (
            <Field label="School">
              <p className="text-sm font-medium py-2">{selectedEvent.school.name}</p>
            </Field>
          )}
        </Section>
      )}

      {/* Interviewee — A&A events with representatives */}
      {isAA && eventReps.length > 0 && (
        <Section icon={Users} title="Interviewee" accent="amber">
          <Field label="Interviewee">
            <Select name="representative_id" defaultValue={application?.representative_id ?? ""}>
              <SelectTrigger className={selectStyles}><SelectValue placeholder="Select interviewee" /></SelectTrigger>
              <SelectContent>
                {eventReps.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </Section>
      )}

      {/* Seats — when event has capacity */}
      {hasCapacity && (
        <Section icon={ClipboardList} title={`Seats (Capacity: ${selectedEvent?.capacity})`} accent="amber">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Seats Requested">
              <Input name="seats_requested" type="number" min="0" className={inputStyles} defaultValue={application?.seats_requested ?? ""} />
            </Field>
            <Field label="Seats Assigned">
              <Input name="seats_assigned" type="number" min="0" className={inputStyles} defaultValue={application?.seats_assigned ?? ""} />
            </Field>
          </div>
        </Section>
      )}

      {/* Pieces — audition events */}
      {isAudition && (
        <EventAppPiecesSection pieces={pieces} onChange={onPiecesChange} />
      )}

      {/* Remarks */}
      <Section icon={MessageSquare} title="Remarks" accent="rose">
        <Field label="Remarks">
          <Textarea
            name="remarks"
            rows={3}
            className="resize-none bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
            defaultValue={application?.remarks ?? ""}
            placeholder="Notes about this event application..."
          />
        </Field>
      </Section>
    </div>
  )
}
