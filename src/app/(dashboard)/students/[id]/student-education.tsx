"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { BookOpen, Mail } from "lucide-react"
import { EducationDialog, EditEducationButton, DeleteEducationButton } from "./education-dialog"
import type { EducationWithJoins } from "@/lib/supabase/queries/student-education"
import type { EducationReferenceData } from "./education-dialog"

type StudentEducationSectionProps = {
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
}: StudentEducationSectionProps) {
  if (educationEntries.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              Education
            </CardTitle>
            <EducationDialog
              studentId={studentId}
              referenceData={referenceData}
              mode="create"
            />
          </div>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-foreground mb-1">No education entries yet</h3>
            <p className="text-sm text-muted-foreground">
              Add a tutoring or prep program enrollment for this student
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            Education ({educationEntries.length})
          </CardTitle>
          <EducationDialog
            studentId={studentId}
            referenceData={referenceData}
            mode="create"
          />
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6 min-w-[180px]">Course</TableHead>
                <TableHead className="min-w-[120px]">Tutor</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Total Hours</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {educationEntries.map((entry) => {
                const style = statusStyles[entry.status?.code ?? "normal"] ?? statusStyles.normal

                return (
                  <TableRow key={entry.id}>
                    <TableCell className="pl-6 font-medium">
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
                    <TableCell className="pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <EditEducationButton
                          education={entry}
                          studentId={studentId}
                          referenceData={referenceData}
                        />
                        <DeleteEducationButton
                          educationId={entry.id}
                          studentId={studentId}
                          courseName={entry.course?.label ?? entry.legacy_course_name ?? "this entry"}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        <div className="px-6 py-3 border-t text-xs text-muted-foreground">
          Total: {educationEntries.length} entr{educationEntries.length !== 1 ? "ies" : "y"}
        </div>
      </CardContent>
    </Card>
  )
}
