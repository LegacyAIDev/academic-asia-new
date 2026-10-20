import Link from "next/link"
import { GraduationCap, Pencil } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { monthYearLabel, statusStyle } from "@/lib/applications/application-display"
import type { ApplicationWithJoins } from "@/lib/supabase/queries/student-applications"
import type { StudentWithJoins } from "@/lib/supabase/queries/students"
import type { AttachmentRecord } from "@/lib/supabase/queries/record-attachments"
import { ApplicationDialog, type ApplicationReferenceData } from "../../application-dialog"

type Props = {
  application: ApplicationWithJoins
  student: StudentWithJoins
  /** Only for users who may edit; the edit button is left out otherwise. */
  edit: {
    referenceData: ApplicationReferenceData
    attachments: AttachmentRecord[]
    attachmentsByDeposit: Map<string, AttachmentRecord[]>
  } | null
}

/** School, student, entry and status at a glance, with the full edit dialog for staff who may write. */
export function ApplicationHeader({ application: app, student, edit }: Props) {
  const entry = [
    app.year_group != null ? `Year ${app.year_group}` : null,
    app.entry_year || app.entry_month ? `apply ${monthYearLabel(app.entry_month, app.entry_year)}` : null,
    app.course_start_year || app.course_start_month ? `starts ${monthYearLabel(app.course_start_month, app.course_start_year)}` : null,
  ].filter(Boolean).join(" · ")

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-gradient-to-r from-primary/5 via-transparent to-transparent p-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-sm">
          <GraduationCap className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl font-semibold leading-tight">
            {app.school ? (
              <Link href={`/schools/${app.school.id}`} className="hover:underline underline-offset-4">{app.school.name}</Link>
            ) : "School application"}
          </h1>
          <p className="text-sm text-muted-foreground">
            <Link href={`/students/${student.id}`} className="font-medium text-foreground hover:underline underline-offset-4">
              {student.first_name} {student.surname}
            </Link>
            {student.student_code && <span> ({student.student_code})</span>}
            {entry && <span> · {entry}</span>}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {app.status ? (
              <Badge variant="outline" className={cn("border text-xs font-medium", statusStyle(app.status.category))}>
                {app.status.label}{app.sub_status && <span className="font-normal"> · {app.sub_status.label}</span>}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">No status</Badge>
            )}
            {app.mode?.code === "suspended" && (
              <Badge variant="outline" className="border-rose-200 bg-rose-50 text-xs text-rose-700">Suspended</Badge>
            )}
            {app.is_referral && <Badge variant="outline" className="text-xs">Referral</Badge>}
            {app.is_archived && <Badge variant="secondary" className="text-xs">Archived</Badge>}
          </div>
        </div>
      </div>

      {edit && (
        <ApplicationDialog
          studentId={student.id}
          referenceData={edit.referenceData}
          mode="edit"
          application={app}
          attachments={edit.attachments}
          attachmentsByDeposit={edit.attachmentsByDeposit}
          trigger={
            <Button variant="outline" size="sm" className="shrink-0 gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Edit application
            </Button>
          }
        />
      )}
    </div>
  )
}
