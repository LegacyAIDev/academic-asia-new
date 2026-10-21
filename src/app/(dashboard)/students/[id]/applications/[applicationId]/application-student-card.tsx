import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { StudentWithJoins } from "@/lib/supabase/queries/students"
import { ageInYears, formatDate } from "@/lib/applications/application-display"
import { Field, Section } from "./application-section"

/**
 * The student facts staff need while working on an application. The consultant
 * is the student's own: applications carry no consultant of their own yet.
 */
export function ApplicationStudentCard({ student }: { student: StudentWithJoins }) {
  const age = ageInYears(student.date_of_birth)
  const consultant = [student.assigned_profile?.first_name, student.assigned_profile?.surname].filter(Boolean).join(" ")

  return (
    <Section title="Student" plain>
      <div className="mb-3">
        <Link href={`/students/${student.id}`}
          className="group inline-flex items-center gap-1 text-base font-semibold hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
          {student.first_name} {student.surname}
          <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none" />
        </Link>
        <p className="text-sm text-muted-foreground">
          {[student.chinese_name, student.student_code].filter(Boolean).join(" · ") || "No code"}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-3">
        <Field label="Date of birth" value={
          student.date_of_birth && <span className="tabular-nums">{formatDate(student.date_of_birth)}{age != null ? ` (${age})` : ""}</span>
        } />
        <Field label="Nationality" value={student.nationality?.label} />
        <Field label="Consultant" value={consultant} />
        <Field label="Mobile" value={student.mobile && <span className="tabular-nums">{student.mobile}</span>} />
        <Field label="Present school" value={student.present_school} wide />
        <Field label="Email" wide value={
          student.email && <a href={`mailto:${student.email}`} className="text-primary underline-offset-2 hover:underline">{student.email}</a>
        } />
      </dl>
    </Section>
  )
}
