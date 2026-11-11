import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Panel, PanelEmpty } from "@/components/ui/panel"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getEventById, getEventSchools, getEventRepresentatives, URL_TO_TYPE_CODE, EVENT_TYPE_LABELS } from "@/lib/supabase/queries/events"
import { canAccess, requireAccess } from "@/lib/permissions/guard"
import { ACCESS, MODULES } from "@/lib/permissions/modules"
import { hkToday } from "@/lib/hk-day"
import { EventHeaderActions } from "./event-header-actions"
import { EditEventButton, EditEventSheet } from "../../event-form-sheet"

/** Admission events have one school and (when 1-to-1) representatives; engagement events list the schools taking part. */
const ADMISSION_TYPES = new Set(["interview", "audition_day", "group_entrance_exam", "school_assessment_scholarship"])

const longDate = (iso: string | null) =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : null
const hhmm = (time: string | null) => (time ? (time.includes("T") ? time.split("T")[1] : time).slice(0, 5) : null)

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children || <span className="text-muted-foreground/60">Not recorded</span>}</dd>
    </div>
  )
}

/**
 * One event on one page: what and when, a prompt for the next thing to set up,
 * then the schools and representatives taking part. Every edit opens the
 * edit drawer at the right part of the form.
 */
export default async function EventDetailPage({ params }: { params: Promise<{ type: string; id: string }> }) {
  await requireAccess(MODULES.EVENTS)
  const { type, id } = await params
  const typeCode = URL_TO_TYPE_CODE[type]
  if (!typeCode) notFound()

  const [event, schools, representatives, canWrite] = await Promise.all([
    getEventById(id), getEventSchools(id), getEventRepresentatives(id), canAccess(MODULES.EVENTS, ACCESS.WRITE),
  ])
  if (!event) notFound()

  const typeLabel = EVENT_TYPE_LABELS[typeCode]
  const admission = ADMISSION_TYPES.has(typeCode)
  const oneToOne = event.scheduling_mode?.code === "one_to_one"
  const today = hkToday()
  const past = Boolean(event.end_date ?? event.start_date) && (event.end_date ?? event.start_date)! < today
  const dates = [longDate(event.start_date), event.end_date && event.end_date !== event.start_date ? longDate(event.end_date) : null].filter(Boolean).join(" to ")
  const times = [hhmm(event.start_time), hhmm(event.end_time)].filter(Boolean).join(" to ")

  // The next thing to set up, in plain words, with the link that does it.
  const next = !canWrite || past ? null
    : schools.length === 0 ? { text: admission ? "Choose the school this event is for." : "Add the schools taking part.", part: admission ? "admission" : "schools", label: admission ? "Choose school" : "Add schools" }
    : oneToOne && representatives.length === 0 ? { text: "Add the school's representatives and when they are free, so 1-to-1 sessions can be booked.", part: "representatives", label: "Add representatives" }
    : oneToOne ? { text: "Representatives are set. Book students into their sessions.", href: `/events/${type}/${id}/scheduler`, label: "Schedule sessions" }
    : null

  return (
    <div className="mx-auto max-w-[1320px] space-y-6">
      <div>
        <Link href={`/events/${type}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> {typeLabel}
        </Link>
        <header className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">{event.name}</h1>
              <Badge variant="outline" className={past ? "font-medium text-muted-foreground" : "border-0 bg-emerald-50 font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/15"}>
                {past ? "Past" : "Upcoming"}
              </Badge>
            </div>
            <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>{typeLabel}</span>
              {dates && <span>{dates}</span>}
              {times && <span>{times}</span>}
              {event.location && <span>{event.location}</span>}
            </p>
          </div>
          <EventHeaderActions eventId={id} eventName={event.name} eventType={type} canSchedule={oneToOne} canWrite={canWrite} />
          {canWrite && <EditEventSheet typeSlug={type} eventId={id} eventName={event.name} />}
        </header>
      </div>

      {next && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border-l-2 border-brand-gold bg-brand-gold/10 px-4 py-3">
          <p className="text-sm"><span className="font-medium">Next step: </span>{next.text}</p>
          {"part" in next && next.part
            ? <EditEventButton part={next.part} size="sm" variant="default" className="gap-1.5"><Plus className="h-4 w-4" /> {next.label}</EditEventButton>
            : <Button size="sm" asChild><Link href={"href" in next ? next.href ?? "" : ""}>{next.label}</Link></Button>}
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Panel title="Details" className="lg:col-span-2">
          <dl className="-my-2 divide-y">
            <Row label="Type">{typeLabel}</Row>
            <Row label="Date">{dates}</Row>
            <Row label="Time">{times}</Row>
            {event.duration_minutes ? <Row label="Duration">{event.duration_minutes} min</Row> : null}
            <Row label="Where">{event.location}</Row>
            {event.scheduling_mode && <Row label="Scheduling">{event.scheduling_mode.label}</Row>}
            {event.assigned_to_profile && <Row label="Looked after by">{[event.assigned_to_profile.first_name, event.assigned_to_profile.surname].filter(Boolean).join(" ")}</Row>}
            {event.remarks && <Row label="Remarks"><span className="whitespace-pre-wrap">{event.remarks}</span></Row>}
          </dl>
        </Panel>
        <Panel title="At a glance">
          <dl className="-my-2 divide-y">
            <Row label="Schools">{schools.length ? schools.length : <span className="text-muted-foreground">None yet</span>}</Row>
            {(admission || representatives.length > 0) && <Row label="Representatives">{representatives.length ? representatives.length : <span className="text-muted-foreground">None yet</span>}</Row>}
            <Row label="Added">{event.created_at ? new Date(event.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null}</Row>
            <Row label="Last changed">{event.updated_at ? new Date(event.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null}</Row>
          </dl>
        </Panel>
      </div>

      <Panel
        title={admission ? "School" : "Schools taking part"}
        count={schools.length}
        flush={schools.length > 0}
        action={canWrite && schools.length > 0 ? <EditEventButton part={admission ? "admission" : "schools"} size="sm" className="h-8">Change schools</EditEventButton> : null}
      >
        {schools.length === 0 ? (
          <PanelEmpty
            title="No schools yet"
            action={canWrite ? <EditEventButton part={admission ? "admission" : "schools"} size="sm" className="h-8 gap-1.5"><Plus className="h-3.5 w-3.5" /> {admission ? "Choose school" : "Add schools"}</EditEventButton> : null}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">School</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Confirmed</TableHead>
                <TableHead className="pr-4">Application deadline</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schools.map(es => (
                <TableRow key={es.id}>
                  <TableCell className="pl-4 font-medium">
                    {es.school ? <Link href={`/schools/${es.school.id}`} className="hover:text-brand-navy hover:underline">{es.school.name}</Link> : "Unknown school"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{[es.school?.city, es.school?.country?.label].filter(Boolean).join(", ") || "—"}</TableCell>
                  <TableCell>
                    {es.is_confirmed
                      ? <Badge variant="outline" className="border-0 bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15">Confirmed</Badge>
                      : <Badge variant="outline" className="text-muted-foreground">Not yet</Badge>}
                  </TableCell>
                  <TableCell className="pr-4 text-sm text-muted-foreground">{es.application_deadline ? longDate(es.application_deadline) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      {(admission || representatives.length > 0) && (
        <Panel
          title="School representatives"
          count={representatives.length}
          flush={representatives.length > 0}
          action={canWrite && representatives.length > 0 ? <EditEventButton part="representatives" size="sm" className="h-8">Change representatives</EditEventButton> : null}
        >
          {representatives.length === 0 ? (
            <PanelEmpty
              title="No representatives yet"
              action={canWrite ? <EditEventButton part="representatives" size="sm" className="h-8 gap-1.5"><Plus className="h-3.5 w-3.5" /> Add representatives</EditEventButton> : null}
            >
              The people the school sends, and when they are free, for 1-to-1 sessions.
            </PanelEmpty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Name</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Free</TableHead>
                  <TableHead className="pr-4">Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {representatives.map(rep => (
                  <TableRow key={rep.id}>
                    <TableCell className="pl-4 font-medium">{rep.name}</TableCell>
                    <TableCell className="text-sm">{rep.school?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {rep.available_from && rep.available_to ? `${hhmm(String(rep.available_from))} to ${hhmm(String(rep.available_to))}` : "—"}
                      {rep.slot_length_minutes ? `, ${rep.slot_length_minutes}-min sessions` : ""}
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate pr-4 text-sm text-muted-foreground">{rep.remarks ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>
      )}
    </div>
  )
}
