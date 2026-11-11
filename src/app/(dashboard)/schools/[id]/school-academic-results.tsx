"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
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
import { AcademicResultDialog, EditAcademicResultButton, DeleteAcademicResultButton } from "./academic-result-dialog"
import type { SchoolAcademicResultWithJoins } from "@/lib/supabase/queries/school-academic-results"
import type { AcademicResultReferenceData } from "./academic-result-dialog"
import { formatResultValue } from "@/lib/schools/academic-results-summary"
import { AcademicResultsSummary } from "./academic-results-summary"

type SchoolAcademicResultsSectionProps = {
  schoolId: string
  results: SchoolAcademicResultWithJoins[]
  referenceData: AcademicResultReferenceData
  /** Add, edit and delete are shown only to staff who may change school data. */
  canWrite?: boolean
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
  canWrite = true,
}: SchoolAcademicResultsSectionProps) {
  const [view, setView] = useState<"summary" | "records">("summary")

  if (results.length === 0) {
    return (
      <Panel title="Exam Results">
        <PanelEmpty title="No academic results recorded" action={canWrite && <AcademicResultDialog schoolId={schoolId} referenceData={referenceData} mode="create" />}>
          Add academic performance data for this school
        </PanelEmpty>
      </Panel>
    )
  }

  return (
    <Panel title="Exam Results" flush action={<><div className="flex items-center gap-2">
            <div role="group" aria-label="View" className="flex items-center gap-1 rounded-lg bg-muted/50 p-[3px]">
              {(["summary", "records"] as const).map(option => (
                <Button key={option} type="button" size="sm" className="h-7 px-2.5 text-xs"
                  variant={view === option ? "secondary" : "ghost"} aria-pressed={view === option}
                  onClick={() => setView(option)}>
                  {option === "summary" ? "Summary" : `All records (${results.length})`}
                </Button>
              ))}
            </div>
            {canWrite && <AcademicResultDialog schoolId={schoolId} referenceData={referenceData} mode="create" />}
          </div></>}>
        {view === "summary" ? <AcademicResultsSummary results={results} /> : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4 min-w-[80px]">Year</TableHead>
                <TableHead className="min-w-[120px]">Exam Type</TableHead>
                <TableHead className="min-w-[120px]">Grade Range</TableHead>
                <TableHead className="min-w-[100px] text-right">Result</TableHead>
                <TableHead className="min-w-[150px]">Remarks</TableHead>
                {canWrite && <TableHead className="pr-4 text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => {
                const badgeStyle = countryStyles[result.exam_type?.country ?? "UK"] ?? countryStyles.UK
                return (
                  <TableRow key={result.id}>
                    <TableCell className="pl-4 font-medium text-sm">
                      {result.exam_year ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${badgeStyle} border text-xs font-medium whitespace-nowrap`}>
                        {result.exam_type?.label ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {result.grade_from
                        ? result.grade_to
                          ? `${result.grade_from} - ${result.grade_to}`
                          : result.grade_from
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-right font-semibold">
                      {formatResultValue(result.result_percentage, result.grade_from, result.exam_type?.code)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <p className="line-clamp-1">{result.remarks || "—"}</p>
                    </TableCell>
                    {canWrite && (
                      <TableCell className="pr-4">
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
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        )}
      </Panel>
  )
}
