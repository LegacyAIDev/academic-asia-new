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
import { ClipboardCheck, Check, Minus } from "lucide-react"
import { EntranceExamDialog, EditEntranceExamButton, DeleteEntranceExamButton } from "./entrance-exam-dialog"
import type { SchoolEntranceExamWithJoins } from "@/lib/supabase/queries/school-entrance-exams"
import type { EntranceExamReferenceData } from "./entrance-exam-dialog"

type SchoolEntranceExamsSectionProps = {
  schoolId: string
  exams: SchoolEntranceExamWithJoins[]
  referenceData: EntranceExamReferenceData
}

function BoolIndicator({ value }: { value: boolean | null }) {
  if (value) return <Check className="h-4 w-4 text-emerald-600" />
  return <Minus className="h-4 w-4 text-muted-foreground/40" />
}

export function SchoolEntranceExamsSection({
  schoolId,
  exams,
  referenceData,
}: SchoolEntranceExamsSectionProps) {
  if (exams.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
              Entrance Exams
            </CardTitle>
            <EntranceExamDialog schoolId={schoolId} referenceData={referenceData} mode="create" />
          </div>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-foreground mb-1">No entrance exams recorded</h3>
            <p className="text-sm text-muted-foreground">
              Add entrance exam information for this school
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
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            Entrance Exams ({exams.length})
          </CardTitle>
          <EntranceExamDialog schoolId={schoolId} referenceData={referenceData} mode="create" />
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6 min-w-[100px]">Entry Year</TableHead>
                <TableHead className="min-w-[120px]">Exam Type</TableHead>
                <TableHead className="min-w-[100px]">Year Level</TableHead>
                <TableHead className="min-w-[180px]">Subject</TableHead>
                <TableHead className="min-w-[80px]">Duration</TableHead>
                <TableHead className="min-w-[70px] text-center">Paper</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exams.map((exam) => (
                <TableRow key={exam.id}>
                  <TableCell className="pl-6 font-medium text-sm">
                    {exam.entry_year || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-medium whitespace-nowrap">
                      {exam.exam_type?.label ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{exam.year_level || "—"}</TableCell>
                  <TableCell className="text-sm">
                    <div>
                      <span>{exam.subject || "—"}</span>
                      {exam.exam_format && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {exam.exam_format}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {exam.duration_minutes ? `${exam.duration_minutes} min` : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <BoolIndicator value={exam.has_paper} />
                  </TableCell>
                  <TableCell className="pr-6">
                    <div className="flex items-center justify-end gap-1">
                      <EditEntranceExamButton
                        exam={exam}
                        schoolId={schoolId}
                        referenceData={referenceData}
                      />
                      <DeleteEntranceExamButton
                        examId={exam.id}
                        schoolId={schoolId}
                        label={exam.subject || "this exam"}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
