"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { GraduationCap, Filter, Eye } from "lucide-react"
import { ApplicationDialog, EditApplicationButton, DeleteApplicationButton } from "./application-dialog"
import { formatDate, monthYearLabel, statusStyle } from "@/lib/applications/application-display"
import type { ApplicationWithJoins } from "@/lib/supabase/queries/student-applications"
import type { ApplicationReferenceData } from "./application-dialog"
import type { AttachmentRecord } from "@/lib/supabase/queries/record-attachments"

type StudentApplicationsSectionProps = {
  studentId: string
  applications: ApplicationWithJoins[]
  referenceData: ApplicationReferenceData
  attachmentsByApplication?: Map<string, AttachmentRecord[]>
  attachmentsByDeposit?: Map<string, AttachmentRecord[]>
  canWrite?: boolean
}

export function StudentApplicationsSection({
  studentId,
  applications,
  referenceData,
  attachmentsByApplication,
  attachmentsByDeposit,
  canWrite = true,
}: StudentApplicationsSectionProps) {
  const [showArchived, setShowArchived] = useState(false)
  const [showSuspended, setShowSuspended] = useState(false)

  const filtered = applications.filter((app) => {
    if (!showArchived && app.is_archived) return false
    if (!showSuspended && app.mode?.code === "suspended") return false
    return true
  })

  const activeCount = applications.filter((a) => !a.is_archived).length

  if (applications.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              School Applications
            </CardTitle>
            {canWrite && (
              <ApplicationDialog
                studentId={studentId}
                referenceData={referenceData}
                mode="create"
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-foreground mb-1">No applications yet</h3>
            <p className="text-sm text-muted-foreground">
              Create a school application to track enrollment progress
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
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            School Applications ({activeCount})
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Filter toggles */}
            <div className="flex items-center gap-1.5 mr-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <Button
                variant={showArchived ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setShowArchived(!showArchived)}
              >
                Archived
              </Button>
              <Button
                variant={showSuspended ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setShowSuspended(!showSuspended)}
              >
                Suspended
              </Button>
            </div>
            {canWrite && (
              <ApplicationDialog
                studentId={studentId}
                referenceData={referenceData}
                mode="create"
              />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6 min-w-[180px]">School</TableHead>
                <TableHead className="min-w-[120px]">Year Apply</TableHead>
                <TableHead>C.S.D.</TableHead>
                <TableHead className="min-w-[150px]">Enrol Status</TableHead>
                <TableHead>Referral</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Scholarship</TableHead>
                <TableHead className="min-w-[150px]">Event</TableHead>
                <TableHead>Reg. Date</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((app) => {
                const href = `/students/${studentId}/applications/${app.id}`

                return (
                  <TableRow key={app.id} className={app.is_archived ? "opacity-60" : ""}>
                    <TableCell className="pl-6 font-medium">
                      <Link href={href} className="text-sm hover:text-primary hover:underline underline-offset-4">
                        {app.school?.name ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{monthYearLabel(app.entry_month, app.entry_year)}</TableCell>
                    <TableCell className="text-sm">{monthYearLabel(app.course_start_month, app.course_start_year)}</TableCell>
                    <TableCell>
                      {app.status ? (
                        <Badge variant="outline" className={`${statusStyle(app.status.category)} border text-xs font-medium whitespace-nowrap`}>
                          {app.status.label}
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{app.is_referral ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      {app.mode?.code === "suspended" ? (
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-xs">
                          Suspended
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">Normal</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {app.scholarship_types && app.scholarship_types.length > 0
                        ? <span className="capitalize">{app.scholarship_types.join(", ")}</span>
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{app.event?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm">{formatDate(app.registration_date)}</TableCell>
                    <TableCell className="pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="icon"
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                          <Link href={href} title="Open application" aria-label="Open application">
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        {canWrite && (
                          <>
                            <EditApplicationButton
                              application={app}
                              studentId={studentId}
                              referenceData={referenceData}
                              attachments={attachmentsByApplication?.get(app.id) ?? []}
                              attachmentsByDeposit={attachmentsByDeposit}
                              canWrite={canWrite}
                            />
                            <DeleteApplicationButton
                              applicationId={app.id}
                              studentId={studentId}
                              schoolName={app.school?.name ?? "this school"}
                            />
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    No applications match current filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {/* Total count footer */}
        <div className="px-6 py-3 border-t text-xs text-muted-foreground">
          Total: {filtered.length} application{filtered.length !== 1 ? "s" : ""}
          {(showArchived || showSuspended) && ` (filtered from ${applications.length})`}
        </div>
      </CardContent>
    </Card>
  )
}
