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
import { CalendarDays, Mail } from "lucide-react"
import { EventApplicationDialog, EditEventApplicationButton, DeleteEventApplicationButton } from "./event-application-dialog"
import type { EventAppWithJoins } from "@/lib/supabase/queries/student-event-applications"
import type { EventAppReferenceData } from "./event-application-dialog"

type StudentEventApplicationsSectionProps = {
  studentId: string
  applications: EventAppWithJoins[]
  referenceData: EventAppReferenceData
}

/** Color map for event application status codes */
const statusStyles: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  booked: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  no_show: "bg-slate-50 text-slate-700 border-slate-200",
}

/** Color map for event type badges */
const eventTypeStyles: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
  pink: "bg-pink-50 text-pink-700 border-pink-200",
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

export function StudentEventApplicationsSection({
  studentId,
  applications,
  referenceData,
}: StudentEventApplicationsSectionProps) {
  if (applications.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              Event Applications
            </CardTitle>
            <EventApplicationDialog
              studentId={studentId}
              referenceData={referenceData}
              mode="create"
            />
          </div>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center">
            <CalendarDays className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-foreground mb-1">No event applications yet</h3>
            <p className="text-sm text-muted-foreground">
              Register for an event like an expo, interview, or audition
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
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            Event Applications ({applications.length})
          </CardTitle>
          <EventApplicationDialog
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
                <TableHead className="pl-6 min-w-[120px]">Event Type</TableHead>
                <TableHead className="min-w-[200px]">Event Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="min-w-[150px]">Remarks</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((app) => {
                const style = statusStyles[app.status?.code ?? "pending"] ?? statusStyles.pending
                const eventType = app.event?.event_types
                const etStyle = eventTypeStyles[eventType?.color ?? "blue"] ?? eventTypeStyles.blue

                return (
                  <TableRow key={app.id}>
                    <TableCell className="pl-6">
                      {eventType ? (
                        <Badge variant="outline" className={`${etStyle} border text-xs font-medium whitespace-nowrap`}>
                          {eventType.label}
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      <span className="text-sm">{app.event?.name ?? app.legacy_event_name ?? "—"}</span>
                    </TableCell>
                    <TableCell>
                      {app.email_sent ? (
                        <Mail className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {app.status ? (
                        <Badge variant="outline" className={`${style} border text-xs font-medium whitespace-nowrap`}>
                          {app.status.label}
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(app.updated_at)}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">
                      {app.remarks || "—"}
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <EditEventApplicationButton
                          application={app}
                          studentId={studentId}
                          referenceData={referenceData}
                        />
                        <DeleteEventApplicationButton
                          applicationId={app.id}
                          studentId={studentId}
                          eventName={app.event?.name ?? app.legacy_event_name ?? "this event"}
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
          Total: {applications.length} application{applications.length !== 1 ? "s" : ""}
        </div>
      </CardContent>
    </Card>
  )
}
