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
import { Trophy } from "lucide-react"
import { AcademicResultDialog, EditAcademicResultButton, DeleteAcademicResultButton } from "./academic-result-dialog"
import type { SchoolAcademicResultWithJoins } from "@/lib/supabase/queries/school-academic-results"
import type { AcademicResultReferenceData } from "./academic-result-dialog"

type SchoolAcademicResultsSectionProps = {
  schoolId: string
  results: SchoolAcademicResultWithJoins[]
  referenceData: AcademicResultReferenceData
}

/** Country-based badge styling for exam type grouping */
const countryStyles: Record<string, string> = {
  UK: "bg-blue-50 text-blue-700 border-blue-200",
  International: "bg-purple-50 text-purple-700 border-purple-200",
  Scotland: "bg-teal-50 text-teal-700 border-teal-200",
}

export function SchoolAcademicResultsSection({
  schoolId,
  results,
  referenceData,
}: SchoolAcademicResultsSectionProps) {
  if (results.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              Academic Results
            </CardTitle>
            <AcademicResultDialog schoolId={schoolId} referenceData={referenceData} mode="create" />
          </div>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center">
            <Trophy className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-foreground mb-1">No academic results recorded</h3>
            <p className="text-sm text-muted-foreground">
              Add academic performance data for this school
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
            <Trophy className="h-4 w-4 text-muted-foreground" />
            Academic Results ({results.length})
          </CardTitle>
          <AcademicResultDialog schoolId={schoolId} referenceData={referenceData} mode="create" />
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6 min-w-[80px]">Year</TableHead>
                <TableHead className="min-w-[120px]">Exam Type</TableHead>
                <TableHead className="min-w-[120px]">Grade Range</TableHead>
                <TableHead className="min-w-[100px] text-right">Result %</TableHead>
                <TableHead className="min-w-[150px]">Remarks</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => {
                const badgeStyle = countryStyles[result.exam_type?.country ?? "UK"] ?? countryStyles.UK
                return (
                  <TableRow key={result.id}>
                    <TableCell className="pl-6 font-medium text-sm">
                      {result.exam_year ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${badgeStyle} border text-xs font-medium whitespace-nowrap`}>
                        {result.exam_type?.label ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {result.grade_range || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-right font-semibold">
                      {result.result_percentage ? `${parseFloat(result.result_percentage)}%` : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <p className="line-clamp-1">{result.remarks || "—"}</p>
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <EditAcademicResultButton
                          result={result}
                          schoolId={schoolId}
                          referenceData={referenceData}
                        />
                        <DeleteAcademicResultButton
                          resultId={result.id}
                          schoolId={schoolId}
                          label={`${result.exam_type?.label ?? "Result"} ${result.exam_year ?? ""}`}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
