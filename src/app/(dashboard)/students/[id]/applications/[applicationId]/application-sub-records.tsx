import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { AttachmentField } from "@/components/features/attachment-field"
import { RecordNotesDialog } from "@/components/features/record-notes-dialog"
import { BOOKING_TYPE_LABELS, TIMEZONE_LABEL, type BookingType } from "@/lib/scheduler/config"
import { assessmentLabel } from "@/lib/scheduler/booking-text-formatters"
import { formatHkDate, formatHkTime } from "@/lib/scheduler/time-utils"
import { formatDate, formatMoney, formatTime } from "@/lib/applications/application-display"
import type { ApplicationWithJoins } from "@/lib/supabase/queries/student-applications"
import type { ApplicationBooking } from "@/lib/supabase/queries/application-bookings"
import type { AttachmentRecord } from "@/lib/supabase/queries/record-attachments"
import { NoneYet, Section } from "./application-section"

const ATTENDANCE_LABELS: Record<string, string> = { show_up: "Showed up", no_show: "No show" }

const listClass = "-my-2 divide-y"
const rowClass = "flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2 text-sm"

type Props = {
  application: ApplicationWithJoins
  /** Null when the user may not see scheduler bookings; the section is then left out. */
  bookings: ApplicationBooking[] | null
  attachments: AttachmentRecord[]
  /** Set only for users who may see exam notes; the Notes button on each exam row is left out otherwise. */
  examNotes: { canWrite: boolean; currentUserId: string | null } | null
}

/** Deposits, entrance exams, linked scheduler bookings and files of one application. */
export function ApplicationSubRecords({ application: app, bookings, attachments, examNotes }: Props) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Section title="Deposits" count={app.deposits.length} plain>
        {app.deposits.length === 0 ? <NoneYet>No deposit recorded.</NoneYet> : (
          <ul className={listClass}>
            {app.deposits.map((d) => (
              <li key={d.id} className={rowClass}>
                <span className="tabular-nums text-muted-foreground">{formatDate(d.deposit_date)}</span>
                <span className="font-medium tabular-nums">{formatMoney(d.amount)}</span>
                {d.discount != null && <span className="tabular-nums text-muted-foreground">discount {formatMoney(d.discount)}</span>}
                {d.has_commission && <Badge variant="outline" className="text-xs">Commission</Badge>}
                {d.remarks && <span className="basis-full text-xs text-muted-foreground">{d.remarks}</span>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Entrance exams" count={app.exams.length} plain>
        {app.exams.length === 0 ? <NoneYet>No entrance exam recorded.</NoneYet> : (
          <ul className={listClass}>
            {app.exams.map((ex) => (
              <li key={ex.id} className={rowClass}>
                <span className="font-medium">{ex.subject ?? "Exam"}</span>
                {ex.score != null && <span className="tabular-nums">score {ex.score}</span>}
                <span className="tabular-nums text-muted-foreground">
                  {ex.confirmed_date
                    ? `${formatDate(ex.confirmed_date)} ${formatTime(ex.confirmed_start_time)}`
                    : ex.preferred_date ? `preferred ${formatDate(ex.preferred_date)}` : "no date yet"}
                </span>
                {(ex.room || ex.seat_no != null) && (
                  <span className="text-muted-foreground">{[ex.room, ex.seat_no != null ? `seat ${ex.seat_no}` : null].filter(Boolean).join(" · ")}</span>
                )}
                {ex.remarks && <span className="basis-full text-xs text-muted-foreground">{ex.remarks}</span>}
                {examNotes && (
                  <span className="ml-auto">
                    <RecordNotesDialog target="exam" recordId={ex.id} title={ex.subject ?? "Exam"}
                      canWrite={examNotes.canWrite} currentUserId={examNotes.currentUserId} />
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {bookings && (
        <Section title="Scheduler bookings" count={bookings.length} plain>
          {bookings.length === 0 ? <NoneYet>No booking is linked to this application.</NoneYet> : (
            <ul className={listClass}>
              {bookings.map((b) => {
                const papers = assessmentLabel(b.assessment_snapshot)
                return (
                  <li key={b.id}>
                    <Link href={`/scheduler/bookings/${b.id}`}
                      className="group -mx-2 flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <span className={b.status === "cancelled" ? "min-w-0 flex-1 text-muted-foreground line-through" : "min-w-0 flex-1"}>
                        <span className="font-medium">{BOOKING_TYPE_LABELS[b.booking_type as BookingType] ?? b.title}</span>
                        {papers && <span className="text-muted-foreground"> · {papers}</span>}
                        <span className="block text-xs tabular-nums text-muted-foreground">
                          {formatHkDate(b.start_at)} {formatHkTime(b.start_at)}–{formatHkTime(b.end_at)} {TIMEZONE_LABEL}
                          {b.room && ` · ${b.room.display_name}`}
                        </span>
                      </span>
                      {b.attendance && <Badge variant="outline" className="text-xs">{ATTENDANCE_LABELS[b.attendance] ?? b.attendance}</Badge>}
                      <Badge variant={b.status === "confirmed" ? "secondary" : "outline"} className="text-xs capitalize">{b.status}</Badge>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Section>
      )}

      <Section title="Attachments" count={attachments.length} plain>
        {attachments.length === 0 ? <NoneYet>No file attached. Add files through Edit application.</NoneYet> : (
          <AttachmentField
            attachPoint="student_application"
            ownerId={app.student_id}
            attachableId={app.id}
            attachments={attachments}
            canWrite={false}
          />
        )}
      </Section>
    </div>
  )
}
