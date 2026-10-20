import { Award, CalendarClock, GraduationCap, MapPin, MessageSquare, Sparkles } from "lucide-react"
import type { ApplicationWithJoins } from "@/lib/supabase/queries/student-applications"
import { formatDate, formatMoney, formatTime, monthYearLabel } from "@/lib/applications/application-display"
import { Field, Section } from "./application-section"

/** Every field of the application record, grouped as in the edit dialog. */
export function ApplicationRecordSections({ application: app }: { application: ApplicationWithJoins }) {
  return (
    <div className="space-y-4">
      <Section icon={GraduationCap} title="School & Status">
        <Field label="School" value={app.school?.name} />
        <Field label="Enrol Status" value={app.status?.label} />
        <Field label="Sub-status" value={app.sub_status?.label} />
        <Field label="Mode" value={app.mode?.code === "suspended" ? "Suspended" : "Normal"} />
        <Field label="Year Group" value={app.year_group?.toString()} />
        <Field label="Enrol Status Remarks" value={app.result_remarks} wide />
      </Section>

      <Section icon={CalendarClock} title="Course & Entry">
        <Field label="Year Apply" value={monthYearLabel(app.entry_month, app.entry_year)} />
        <Field label="Course Start Date (C.S.D.)" value={monthYearLabel(app.course_start_month, app.course_start_year)} />
        <Field label="Registration Date" value={formatDate(app.registration_date)} />
        {app.course_detail && <Field label="Course Detail" value={app.course_detail} wide />}
      </Section>

      <Section icon={Award} title="Referral & Scholarship">
        <Field label="Referral" value={app.is_referral ? "Yes" : "No"} />
        <Field label="Scholarship Types" value={
          app.scholarship_types?.length ? <span className="capitalize">{app.scholarship_types.join(", ")}</span> : null
        } />
        {app.scholarship_amount != null && <Field label="Scholarship Amount" value={formatMoney(app.scholarship_amount)} />}
        <Field label="Scholarship Detail" value={app.scholarship_detail} wide />
      </Section>

      <Section icon={Sparkles} title="Event & Audition">
        <Field label="Event" value={app.event?.name} />
        <Field label="Event Date" value={formatDate(app.event_date)} />
        <Field label="Event Time" value={formatTime(app.event_time)} />
        <Field label="Music Audition" value={app.music_audition} wide />
      </Section>

      <Section icon={MapPin} title="School Visit">
        <Field label="Visit Date" value={formatDate(app.visit_date)} />
        <Field label="Visit Time" value={formatTime(app.visit_time)} />
        <Field label="School Contact" value={app.school_contact} />
        <Field label="Visit Remarks" value={app.visit_remarks} wide />
      </Section>

      <Section icon={MessageSquare} title="Remarks">
        <Field label="AA Remarks" value={app.aa_remarks} wide />
        <Field label="Remarks to School" value={app.remarks_to_school} wide />
      </Section>
    </div>
  )
}
