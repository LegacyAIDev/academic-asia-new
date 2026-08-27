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
import { Plane, Check, Minus } from "lucide-react"
import { TravelDialog, EditTravelButton, DeleteTravelButton } from "./travel-dialog"
import type { TravelWithJoins } from "@/lib/supabase/queries/student-travel"
import type { TravelReferenceData } from "./travel-dialog"
import type { AttachmentRecord } from "@/lib/supabase/queries/record-attachments"

type StudentTravelSectionProps = {
  studentId: string
  travelRecords: TravelWithJoins[]
  referenceData: TravelReferenceData
  attachmentsByTravel?: Map<string, AttachmentRecord[]>
  canWrite?: boolean
}

/** Color map for travel status codes */
const statusStyles: Record<string, string> = {
  normal: "bg-slate-50 text-slate-700 border-slate-200",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  completed: "bg-blue-50 text-blue-700 border-blue-200",
}

/** Yes/No boolean indicator */
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

export function StudentTravelSection({
  studentId,
  travelRecords,
  referenceData,
  attachmentsByTravel,
  canWrite = true,
}: StudentTravelSectionProps) {
  if (travelRecords.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Plane className="h-4 w-4 text-muted-foreground" />
              Travel
            </CardTitle>
            <TravelDialog
              studentId={studentId}
              referenceData={referenceData}
              mode="create"
            />
          </div>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center">
            <Plane className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-foreground mb-1">No travel records yet</h3>
            <p className="text-sm text-muted-foreground">
              Add flight details and pickup arrangements for this student
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
            <Plane className="h-4 w-4 text-muted-foreground" />
            Travel ({travelRecords.length})
          </CardTitle>
          <TravelDialog
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
                <TableHead className="pl-6 w-[50px]">Pickup</TableHead>
                <TableHead className="w-[50px]">Jou.</TableHead>
                <TableHead className="w-[50px]">Rt.</TableHead>
                <TableHead className="min-w-[120px]">Airline</TableHead>
                <TableHead className="min-w-[150px]">Airport</TableHead>
                <TableHead>Flight No</TableHead>
                <TableHead>Arrival Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="min-w-[140px]">Pickup Status</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {travelRecords.map((rec) => {
                const style = statusStyles[rec.status?.code ?? "normal"] ?? statusStyles.normal

                return (
                  <TableRow key={rec.id}>
                    <TableCell className="pl-6">
                      <BoolIndicator value={rec.requires_pickup} />
                    </TableCell>
                    <TableCell className="text-sm">{rec.journey_no ?? "—"}</TableCell>
                    <TableCell className="text-sm">{rec.route ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      {rec.airline?.label ?? rec.legacy_airline ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {rec.airport?.label ?? rec.legacy_airport ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {rec.flight_number || "—"}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(rec.arrival_date)}</TableCell>
                    <TableCell className="text-sm">{rec.arrival_time || "—"}</TableCell>
                    <TableCell className="text-sm max-w-[160px] truncate">
                      {rec.pickup_status_ref?.label ?? rec.legacy_pickup_status ?? "—"}
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
                        <EditTravelButton
                          travel={rec}
                          studentId={studentId}
                          referenceData={referenceData}
                          attachments={attachmentsByTravel?.get(rec.id) ?? []}
                          canWrite={canWrite}
                        />
                        <DeleteTravelButton
                          travelId={rec.id}
                          studentId={studentId}
                          label={rec.airline?.label ?? rec.flight_number ?? "this record"}
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
          Total: {travelRecords.length} record{travelRecords.length !== 1 ? "s" : ""}
        </div>
      </CardContent>
    </Card>
  )
}
