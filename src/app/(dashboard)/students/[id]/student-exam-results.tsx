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
import { FileCheck, Check, Minus } from "lucide-react"
import { ExamResultDialog, EditExamResultButton, DeleteExamResultButton } from "./exam-result-dialog"
import type { ExamResultWithJoins } from "@/lib/supabase/queries/student-exam-results"
import type { ExamResultReferenceData } from "./exam-result-dialog"

type StudentExamResultsSectionProps = {
  studentId: string
  examResults: ExamResultWithJoins[]
  referenceData: ExamResultReferenceData
}

/** Status badge styles keyed by exam result status code */
const statusStyles: Record<string, string> = {
  normal: "bg-slate-50 text-slate-700 border-slate-200",
  suspended: "bg-amber-50 text-amber-700 border-amber-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
}

function BoolIndicator({ value }: { value: boolean | null }) {
  if (value) {
    return <Check className="h-4 w-4 text-emerald-600" />
  }
  return <Minus className="h-4 w-4 text-muted-foreground/40" />
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

export function StudentExamResultsSection({
  studentId,
  examResults,
  referenceData,
}: StudentExamResultsSectionProps) {
  if (examResults.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-muted-foreground" />
              Exam Results
            </CardTitle>
            <ExamResultDialog
              studentId={studentId}
              referenceData={referenceData}
              mode="create"
            />
          </div>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center">
            <FileCheck className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-foreground mb-1">No exam results yet</h3>
            <p className="text-sm text-muted-foreground">
              Record test and exam results for this student
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
            <FileCheck className="h-4 w-4 text-muted-foreground" />
            Exam Results ({examResults.length})
          </CardTitle>
          <ExamResultDialog
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
                <TableHead className="pl-6">Test Date</TableHead>
                <TableHead className="min-w-[120px]">School</TableHead>
                <TableHead className="min-w-[100px]">Exam Paper</TableHead>
                <TableHead className="min-w-[120px]">Test/Exam</TableHead>
                <TableHead className="min-w-[100px]">Subject</TableHead>
                <TableHead className="w-[50px]">Ready</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Max</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {examResults.map((rec) => {
                const style = statusStyles[rec.status?.code ?? "normal"] ?? statusStyles.normal

                return (
                  <TableRow key={rec.id}>
                    <TableCell className="pl-6 text-sm">{formatDate(rec.test_date)}</TableCell>
                    <TableCell className="text-sm max-w-[160px] truncate">
                      {rec.school?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {rec.paper?.label ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {rec.exam_type?.label ?? rec.legacy_exam ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {rec.subject?.label ?? rec.legacy_course ?? "—"}
                    </TableCell>
                    <TableCell>
                      <BoolIndicator value={rec.paper_ready} />
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {rec.score != null ? rec.score : "—"}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {rec.max_score != null ? rec.max_score : "—"}
                    </TableCell>
                    <TableCell>
                      {rec.status ? (
                        <Badge variant="outline" className={`${style} border text-xs font-medium whitespace-nowrap`}>
                          {rec.status.label}
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(rec.updated_at)}</TableCell>
                    <TableCell className="pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <EditExamResultButton
                          examResult={rec}
                          studentId={studentId}
                          referenceData={referenceData}
                        />
                        <DeleteExamResultButton
                          resultId={rec.id}
                          studentId={studentId}
                          label={rec.exam_type?.label ?? rec.subject?.label ?? "this result"}
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
          Total: {examResults.length} result{examResults.length !== 1 ? "s" : ""}
        </div>
      </CardContent>
    </Card>
  )
}
