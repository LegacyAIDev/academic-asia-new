import type { ReactNode } from "react"
import { Panel } from "@/components/ui/panel"
import { AttachmentField } from "@/components/features/attachment-field"
import type { AttachmentRecord } from "@/lib/supabase/queries/record-attachments"
import type { getStudentById } from "@/lib/supabase/queries/students"

type Student = NonNullable<Awaited<ReturnType<typeof getStudentById>>>

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
const LEAD_SOURCES: Record<string, string> = { walk_in: "Walk-in", referral: "Referral", event: "Event", website: "Website", other: "Other" }

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-foreground">{children}</dd>
    </div>
  )
}

const Empty = () => <span className="text-muted-foreground/60">Not recorded</span>

/** The student's contact, schooling and placement details in one compact list. */
export function StudentDetailsPanel({ student, examPaperAttachments, canWrite }: {
  student: Student
  examPaperAttachments: AttachmentRecord[]
  canWrite: boolean
}) {
  const entry = student.entry_year ? `${student.entry_month ? `${MONTHS[student.entry_month - 1]} ` : ""}${student.entry_year}` : null
  const lead = student.lead_source_category
    ? [LEAD_SOURCES[student.lead_source_category] ?? student.lead_source_category.replace(/_/g, " "), student.lead_source_referral_detail, student.lead_source_event?.name].filter(Boolean).join(", ")
    : null

  return (
    <Panel title="Details">
      <dl className="-my-2 divide-y">
        <Row label="Email">{student.email ? <a href={`mailto:${student.email}`} className="hover:text-brand-navy hover:underline">{student.email}</a> : <Empty />}</Row>
        <Row label="Mobile">{student.mobile ? <a href={`tel:${student.mobile}`} className="hover:text-brand-navy hover:underline">{student.mobile}</a> : <Empty />}</Row>
        {student.telephone && <Row label="Telephone">{student.telephone}</Row>}
        <Row label="Address">
          {student.address_line_1 || student.chinese_address ? (
            <>
              {student.address_line_1 && <span className="block">{student.address_line_1}</span>}
              {student.chinese_address && <span className="block text-muted-foreground">{student.chinese_address}</span>}
            </>
          ) : <Empty />}
        </Row>
        <Row label="Current school">
          {student.present_school ? (
            <>
              <span className="block">{student.present_school}</span>
              {student.school_type && <span className="block text-xs text-muted-foreground">{student.school_type.label}</span>}
            </>
          ) : <Empty />}
        </Row>
        <Row label="Course and entry">{student.course?.label || entry ? [student.course?.label, entry].filter(Boolean).join(", ") : <Empty />}</Row>
        {student.enrollment_date && <Row label="Enrolled">{dateFormat.format(new Date(`${student.enrollment_date.slice(0, 10)}T00:00:00Z`))}</Row>}
        <Row label="Lead source">{lead ?? <Empty />}</Row>
        <Row label="Exam paper">
          {student.exam_paper && <span className="block">{student.exam_paper}</span>}
          <AttachmentField attachPoint="student_exam_paper" ownerId={student.id} attachableId={student.id} attachments={examPaperAttachments} canWrite={canWrite} />
        </Row>
        <Row label="Newsletter">{student.aa_news ? "Subscribed" : "Not subscribed"}</Row>
        <Row label="Airport pickup">{student.airport_pickup ? "Needed" : "Not needed"}</Row>
        {student.remarks && <Row label="Remarks"><span className="whitespace-pre-wrap">{student.remarks}</span></Row>}
      </dl>
    </Panel>
  )
}
