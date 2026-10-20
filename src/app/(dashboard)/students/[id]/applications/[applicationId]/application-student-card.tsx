import Link from "next/link"
import { ArrowRight, User } from "lucide-react"
import { Button } from "@/components/ui/button"
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
    <Section icon={User} title="Student" plain>
      <div className="grid gap-3">
        <Field label="Name" value={
          <>
            {student.first_name} {student.surname}
            {student.chinese_name && <span className="text-muted-foreground"> · {student.chinese_name}</span>}
          </>
        } />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Student Code" value={student.student_code} />
          <Field label="Date of Birth" value={
            student.date_of_birth ? `${formatDate(student.date_of_birth)}${age != null ? ` (${age})` : ""}` : null
          } />
          <Field label="Nationality" value={student.nationality?.label} />
          <Field label="Consultant" value={consultant} />
        </div>
        <Field label="Present School" value={student.present_school} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mobile" value={student.mobile} />
          <Field label="Email" value={
            student.email ? <a href={`mailto:${student.email}`} className="text-primary underline-offset-2 hover:underline">{student.email}</a> : null
          } />
        </div>
        <Button asChild variant="outline" size="sm" className="mt-1 w-full gap-1.5">
          <Link href={`/students/${student.id}`}>
            Open student profile <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </Section>
  )
}
