import Link from "next/link"
import { CalendarCheck, ClipboardCheck, Paperclip, Wallet } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { AttachmentField } from "@/components/features/attachment-field"
import { BOOKING_TYPE_LABELS, TIMEZONE_LABEL, type BookingType } from "@/lib/scheduler/config"
import { assessmentLabel } from "@/lib/scheduler/booking-text-formatters"
import { formatHkDate, formatHkTime } from "@/lib/scheduler/time-utils"
import { formatDate, formatMoney, formatTime } from "@/lib/applications/application-display"
import type { ApplicationWithJoins } from "@/lib/supabase/queries/student-applications"
import type { ApplicationBooking } from "@/lib/supabase/queries/application-bookings"
import type { AttachmentRecord } from "@/lib/supabase/queries/record-attachments"
import { Section } from "./application-section"

const ATTENDANCE_LABELS: Record<string, string> = { show_up: "Showed up", no_show: "No show" }

const rowClass = "rounded-lg border bg-background p-3 text-sm"
const None = () => <p className="text-sm text-muted-foreground">None</p>

type Props = {
  application: ApplicationWithJoins
  /** Null when the user may not see scheduler bookings; the section is then left out. */
  bookings: ApplicationBooking[] | null
  attachments: AttachmentRecord[]
}

/** Deposits, entrance exams, linked scheduler bookings and files of one application. */
export function ApplicationSubRecords({ application: app, bookings, attachments }: Props) {
  return (
    <div className="space-y-4">
      <Section icon={Wallet} title="Deposits" count={app.deposits.length} plain>
        {app.deposits.length === 0 ? <None /> : (
          <div className="space-y-2">
            {app.deposits.map((d) => (
              <div key={d.id} className={`${rowClass} flex flex-wrap items-center gap-x-4 gap-y-1`}>
                <span className="font-medium">{formatDate(d.deposit_date)}</span>
                <span>Amount: {formatMoney(d.amount)}</span>
                <span>Discount: {formatMoney(d.discount)}</span>
                {d.has_commission && <Badge variant="outline" className="text-xs">Commission</Badge>}
                {d.remarks && <span className="text-muted-foreground">· {d.remarks}</span>}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section icon={ClipboardCheck} title="Entrance Exams" count={app.exams.length} plain>
        {app.exams.length === 0 ? <None /> : (
          <div className="space-y-2">
            {app.exams.map((ex) => (
              <div key={ex.id} className={rowClass}>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="font-medium">{ex.subject ?? "Exam"}</span>
                  {ex.apply_year && <span className="text-muted-foreground">Apply: {ex.apply_year}</span>}
                  {ex.score != null && <span>Score: {ex.score}</span>}
                  {ex.room && <span>Room: {ex.room}</span>}
                  {ex.seat_no != null && <span>Seat: {ex.seat_no}</span>}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Preferred: {formatDate(ex.preferred_date)} {formatTime(ex.preferred_start_time)}</span>
                  <span>Confirmed: {formatDate(ex.confirmed_date)} {formatTime(ex.confirmed_start_time)}</span>
                  {ex.remarks && <span>· {ex.remarks}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {bookings && (
        <Section icon={CalendarCheck} title="Scheduler Bookings" count={bookings.length} plain>
          {bookings.length === 0 ? <None /> : (
            <div className="space-y-2">
              {bookings.map((b) => (
                <Link key={b.id} href={`/scheduler/bookings/${b.id}`}
                  className={`${rowClass} flex flex-wrap items-center gap-x-4 gap-y-1 transition-colors hover:bg-muted/50`}>
                  <span className="font-medium tabular-nums">
                    {formatHkDate(b.start_at)} {formatHkTime(b.start_at)}–{formatHkTime(b.end_at)} {TIMEZONE_LABEL}
                  </span>
                  <span>{BOOKING_TYPE_LABELS[b.booking_type as BookingType] ?? b.title}</span>
                  {assessmentLabel(b.assessment_snapshot) && <span className="text-muted-foreground">{assessmentLabel(b.assessment_snapshot)}</span>}
                  {b.room && <span className="text-muted-foreground">{b.room.display_name}</span>}
                  <Badge variant={b.status === "cancelled" ? "secondary" : "outline"} className="text-xs capitalize">{b.status}</Badge>
                  {b.attendance && <Badge variant="outline" className="text-xs">{ATTENDANCE_LABELS[b.attendance] ?? b.attendance}</Badge>}
                </Link>
              ))}
            </div>
          )}
        </Section>
      )}

      <Section icon={Paperclip} title="Attachments" count={attachments.length} plain>
        {attachments.length === 0 ? <None /> : (
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
