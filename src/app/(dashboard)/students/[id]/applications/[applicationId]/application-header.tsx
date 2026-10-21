import Link from "next/link"
import { Pencil } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { monthYearLabel, statusStyle } from "@/lib/applications/application-display"
import type { ApplicationWithJoins } from "@/lib/supabase/queries/student-applications"
import type { StudentWithJoins } from "@/lib/supabase/queries/students"
import type { AttachmentRecord } from "@/lib/supabase/queries/record-attachments"
import { ApplicationDialog, type ApplicationReferenceData } from "../../application-dialog"
import { Eyebrow } from "./application-section"

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
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        <Eyebrow as="p">School application</Eyebrow>
        <h1 className="text-2xl font-semibold tracking-tight">
          {app.school ? (
            <Link href={`/schools/${app.school.id}`} className="underline-offset-4 hover:underline">{app.school.name}</Link>
          ) : "Unknown school"}
        </h1>
        <p className="text-sm text-muted-foreground">
          <Link href={`/students/${student.id}`} className="font-medium text-foreground underline-offset-4 hover:underline">
            {student.first_name} {student.surname}
          </Link>
          {student.student_code && <span className="tabular-nums"> · {student.student_code}</span>}
          {entry && <span className="tabular-nums"> · {entry}</span>}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {app.status ? (
            <Badge variant="outline" className={cn("border text-xs font-medium", statusStyle(app.status.category))}>
              {app.status.label}{app.sub_status && <span className="font-normal opacity-80"> · {app.sub_status.label}</span>}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">No status</Badge>
          )}
          {app.mode?.code === "suspended" && <Badge variant="destructive" className="text-xs">Suspended</Badge>}
          {app.is_referral && <Badge variant="outline" className="text-xs">Referral</Badge>}
          {app.is_archived && <Badge variant="secondary" className="text-xs">Archived</Badge>}
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
    </header>
  )
}
