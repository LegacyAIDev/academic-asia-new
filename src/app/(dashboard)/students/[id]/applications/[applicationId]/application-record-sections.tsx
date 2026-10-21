import type { ApplicationWithJoins } from "@/lib/supabase/queries/student-applications"
import { formatDate, formatMoney, formatTime, monthYearLabel } from "@/lib/applications/application-display"
import { Eyebrow, Field, SubSection } from "./application-section"

type Group = { title: string; filled: boolean; fields: React.ReactNode }

/**
 * Every field of the application record in one card, grouped as in the edit
 * dialog. Groups with nothing recorded are folded into one line at the end, so
 * the card shows what is known instead of rows of dashes.
 */
export function ApplicationRecordSections({ application: app }: { application: ApplicationWithJoins }) {
  const csd = monthYearLabel(app.course_start_month, app.course_start_year)
  const yearApply = monthYearLabel(app.entry_month, app.entry_year)

  const groups: Group[] = [
    {
      title: "Status",
      filled: true,
      fields: (
        <>
          <Field label="Enrol status" value={app.status?.label} />
          <Field label="Sub-status" value={app.sub_status?.label} />
          <Field label="Mode" value={app.mode?.code === "suspended" ? "Suspended" : "Normal"} />
          <Field label="Year group" value={app.year_group?.toString()} />
          {app.result_remarks && <Field label="Enrol status remarks" value={app.result_remarks} wide />}
        </>
      ),
    },
    {
      title: "Course & entry",
      filled: Boolean(app.entry_year || app.entry_month || app.course_start_year || app.course_start_month || app.registration_date || app.course_detail),
      fields: (
        <>
          <Field label="Year apply" value={yearApply === "—" ? null : yearApply} />
          <Field label="Course start (C.S.D.)" value={csd === "—" ? null : csd} />
          <Field label="Registration date" value={app.registration_date && formatDate(app.registration_date)} />
          {app.course_detail && <Field label="Course detail" value={app.course_detail} wide />}
        </>
      ),
    },
    {
      title: "Referral & scholarship",
      filled: Boolean(app.is_referral || app.scholarship_types?.length || app.scholarship_amount != null || app.scholarship_detail),
      fields: (
        <>
          <Field label="Referral" value={app.is_referral ? "Yes" : "No"} />
          <Field label="Scholarship types" value={
            app.scholarship_types?.length ? <span className="capitalize">{app.scholarship_types.join(", ")}</span> : null
          } />
          {app.scholarship_amount != null && <Field label="Scholarship amount" value={<span className="tabular-nums">{formatMoney(app.scholarship_amount)}</span>} />}
          {app.scholarship_detail && <Field label="Scholarship detail" value={app.scholarship_detail} wide />}
        </>
      ),
    },
    {
      title: "Event & audition",
      filled: Boolean(app.event || app.event_date || app.music_audition),
      fields: (
        <>
          <Field label="Event" value={app.event?.name} />
          <Field label="Date and time" value={app.event_date && `${formatDate(app.event_date)}${app.event_time ? ` · ${formatTime(app.event_time)}` : ""}`} />
          {app.music_audition && <Field label="Music audition" value={app.music_audition} wide />}
        </>
      ),
    },
    {
      title: "School visit",
      filled: Boolean(app.visit_date || app.school_contact || app.visit_remarks),
      fields: (
        <>
          <Field label="Date and time" value={app.visit_date && `${formatDate(app.visit_date)}${app.visit_time ? ` · ${formatTime(app.visit_time)}` : ""}`} />
          <Field label="School contact" value={app.school_contact} />
          {app.visit_remarks && <Field label="Visit remarks" value={app.visit_remarks} wide />}
        </>
      ),
    },
    {
      title: "Remarks",
      filled: Boolean(app.aa_remarks || app.remarks_to_school),
      fields: (
        <>
          <Field label="AA remarks" value={app.aa_remarks} wide />
          <Field label="Remarks to school" value={app.remarks_to_school} wide />
        </>
      ),
    },
  ]

  const empty = groups.filter(group => !group.filled)

  return (
    <section aria-label="Application record" className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
      <Eyebrow>Record</Eyebrow>
      <div className="space-y-4">
        {groups.filter(group => group.filled).map(group => (
          <SubSection key={group.title} title={group.title}>{group.fields}</SubSection>
        ))}
      </div>
      {empty.length > 0 && (
        <p className="border-t pt-3 text-xs text-muted-foreground">
          Not recorded: {empty.map(group => group.title).join(", ")}
        </p>
      )}
    </section>
  )
}
