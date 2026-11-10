"use client"

import { Panel, PanelEmpty } from "@/components/ui/panel"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Mail } from "lucide-react"
import { EducationDialog, EditEducationButton, DeleteEducationButton } from "./education-dialog"
import type { EducationWithJoins } from "@/lib/supabase/queries/student-education"
import type { EducationReferenceData } from "./education-dialog"

type StudentEducationSectionProps = {
  /** False for read-only staff: hides adding, editing and deleting. */
  canWrite?: boolean
  studentId: string
  educationEntries: EducationWithJoins[]
  referenceData: EducationReferenceData
}

/** Color map for education status codes */
const statusStyles: Record<string, string> = {
  normal: "bg-slate-50 text-slate-700 border-slate-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

export function StudentEducationSection({
  studentId,
  educationEntries,
  referenceData,
  canWrite = true,
}: StudentEducationSectionProps) {
  if (educationEntries.length === 0) {
    return (
      <Panel title="Tutoring courses">
        <PanelEmpty title="No tutoring courses yet" action={canWrite ? (
          <EducationDialog
                studentId={studentId}
                referenceData={referenceData}
                mode="create"
              />
        ) : null}>
          Add a tutoring or prep program enrollment for this student
        </PanelEmpty>
      </Panel>
    )
  }

  return (
    <Panel title="Tutoring courses" count={educationEntries.length} flush action={canWrite ? (
        <EducationDialog
              studentId={studentId}
              referenceData={referenceData}
              mode="create"
            />
      ) : null}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4 min-w-[180px]">Course</TableHead>
                <TableHead className="min-w-[120px]">Tutor</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Total Hours</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {educationEntries.map((entry) => {
                const style = statusStyles[entry.status?.code ?? "normal"] ?? statusStyles.normal

                return (
                  <TableRow key={entry.id}>
                    <TableCell className="pl-4 font-medium">
                      <span className="text-sm">{entry.course?.label ?? entry.legacy_course_name ?? "—"}</span>
                    </TableCell>
                    <TableCell className="text-sm">{entry.tutor || "—"}</TableCell>
                    <TableCell className="text-sm">{formatDate(entry.start_date)}</TableCell>
                    <TableCell className="text-sm">{formatDate(entry.end_date)}</TableCell>
                    <TableCell className="text-sm">{entry.total_hours || "—"}</TableCell>
                    <TableCell>
                      {entry.email_sent ? (
                        <Mail className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.status ? (
                        <Badge variant="outline" className={`${style} border text-xs font-medium whitespace-nowrap`}>
                          {entry.status.label}
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(entry.updated_at)}</TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1">
                        {canWrite && (
                          <EditEducationButton
                            education={entry}
                            studentId={studentId}
                            referenceData={referenceData}
                          />
                        )}
                        {canWrite && (
                          <DeleteEducationButton
                            educationId={entry.id}
                            studentId={studentId}
                            courseName={entry.course?.label ?? entry.legacy_course_name ?? "this entry"}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
    </Panel>
  )
}
