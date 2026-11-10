"use client"

import { useState } from "react"
import Link from "next/link"
import { Panel, PanelEmpty } from "@/components/ui/panel"
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
import { ApplicationDialog, EditApplicationButton, DeleteApplicationButton } from "./application-dialog"
import { formatDate, monthYearLabel, statusStyle } from "@/lib/applications/application-display"
import { journeyFor, stageLabel } from "@/lib/applications/application-journey"
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

/** Where an application stands, in plain words, under the school's own status name. */
function progressLabel(statusCode: string | null | undefined): string | null {
  const { stage, outcome } = journeyFor(statusCode)
  if (outcome === "placed") return "Placed"
  if (outcome === "closed") return "Closed"
  return stage ? stageLabel(stage) : null
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

  const archivedCount = applications.filter(a => a.is_archived).length
  const suspendedCount = applications.filter(a => a.mode?.code === "suspended").length
  const filtered = applications.filter(app => {
    if (!showArchived && app.is_archived) return false
    if (!showSuspended && app.mode?.code === "suspended") return false
    return true
  })
  const addButton = canWrite ? <ApplicationDialog studentId={studentId} referenceData={referenceData} mode="create" /> : null

  if (applications.length === 0) {
    return (
      <Panel title="School applications" action={addButton}>
        <PanelEmpty title="No applications yet">
          Add a school this student is applying to, then track it from registration to a place.
        </PanelEmpty>
      </Panel>
    )
  }

  // Show a column only when some application has something for it.
  const show = {
    csd: filtered.some(a => a.course_start_year),
    referral: filtered.some(a => a.is_referral),
    scholarship: filtered.some(a => a.scholarship_types?.length),
    registered: filtered.some(a => a.registration_date),
  }

  return (
    <Panel
      title="School applications"
      count={applications.length - archivedCount}
      flush
      action={
        <>
          {archivedCount > 0 && (
            <Button variant={showArchived ? "secondary" : "ghost"} size="sm" className="h-8 text-xs" aria-pressed={showArchived} onClick={() => setShowArchived(!showArchived)}>
              {showArchived ? "Hide" : "Show"} archived ({archivedCount})
            </Button>
          )}
          {suspendedCount > 0 && (
            <Button variant={showSuspended ? "secondary" : "ghost"} size="sm" className="h-8 text-xs" aria-pressed={showSuspended} onClick={() => setShowSuspended(!showSuspended)}>
              {showSuspended ? "Hide" : "Show"} suspended ({suspendedCount})
            </Button>
          )}
          {addButton}
        </>
      }
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-[200px] pl-4">School</TableHead>
              <TableHead>Entry</TableHead>
              {show.csd && <TableHead title="Course start date">Course starts</TableHead>}
              <TableHead className="min-w-[180px]">Status</TableHead>
              {show.scholarship && <TableHead>Scholarship</TableHead>}
              {show.referral && <TableHead>Referral</TableHead>}
              {show.registered && <TableHead>Registered</TableHead>}
              <TableHead className="w-24 pr-4"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(app => {
              const href = `/students/${studentId}/applications/${app.id}`
              const progress = progressLabel(app.status?.code)
              return (
                // The school link stretches over the row, so anywhere on it opens the application.
                <TableRow key={app.id} className={`group relative ${app.is_archived ? "opacity-60" : ""}`}>
                  <TableCell className="py-3 pl-4">
                    <Link href={href} className="font-medium after:absolute after:inset-0 after:content-[''] group-hover:text-brand-navy">
                      {app.school?.name ?? "Unknown school"}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {[app.event?.name, app.mode?.code === "suspended" ? "Suspended" : null, app.is_archived ? "Archived" : null].filter(Boolean).join(", ")}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm">{monthYearLabel(app.entry_month, app.entry_year)}</TableCell>
                  {show.csd && <TableCell className="text-sm">{monthYearLabel(app.course_start_month, app.course_start_year)}</TableCell>}
                  <TableCell>
                    {app.status ? (
                      <>
                        <Badge variant="outline" className={`${statusStyle(app.status.category)} whitespace-nowrap border text-xs font-medium`}>
                          {app.status.label}
                        </Badge>
                        {progress && progress !== app.status.label && <p className="mt-1 text-xs text-muted-foreground">{progress}</p>}
                      </>
                    ) : <span className="text-sm text-muted-foreground">No status yet</span>}
                  </TableCell>
                  {show.scholarship && (
                    <TableCell className="text-sm capitalize">{app.scholarship_types?.length ? app.scholarship_types.join(", ") : ""}</TableCell>
                  )}
                  {show.referral && <TableCell className="text-sm">{app.is_referral ? "Yes" : ""}</TableCell>}
                  {show.registered && <TableCell className="whitespace-nowrap text-sm">{app.registration_date ? formatDate(app.registration_date) : ""}</TableCell>}
                  <TableCell className="relative z-10 pr-4">
                    {canWrite && (
                      <div className="flex items-center justify-end gap-1">
                        <EditApplicationButton
                          application={app}
                          studentId={studentId}
                          referenceData={referenceData}
                          attachments={attachmentsByApplication?.get(app.id) ?? []}
                          attachmentsByDeposit={attachmentsByDeposit}
                          canWrite={canWrite}
                        />
                        <DeleteApplicationButton applicationId={app.id} studentId={studentId} schoolName={app.school?.name ?? "this school"} />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  Every application is archived or suspended. Use the buttons above to show them.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Panel>
  )
}
