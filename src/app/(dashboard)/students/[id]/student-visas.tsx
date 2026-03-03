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
import { Shield, Check, Minus } from "lucide-react"
import { VisaDialog, EditVisaButton, DeleteVisaButton } from "./visa-dialog"
import type { VisaWithJoins } from "@/lib/supabase/queries/student-visas"
import type { VisaReferenceData } from "./visa-dialog"

type StudentVisasSectionProps = {
  studentId: string
  visas: VisaWithJoins[]
  referenceData: VisaReferenceData
}

/** Color map for visa status codes */
const statusStyles: Record<string, string> = {
  normal: "bg-slate-50 text-slate-700 border-slate-200",
  suspended: "bg-rose-50 text-rose-700 border-rose-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-amber-50 text-amber-700 border-amber-200",
}

/** Compact boolean indicator for checklist columns */
function BoolIndicator({ value }: { value: boolean | null }) {
  if (value) {
    return <Check className="h-4 w-4 text-emerald-600" />
  }
  return <Minus className="h-3.5 w-3.5 text-muted-foreground/40" />
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

function formatEntryYear(month: number | null, year: number | null) {
  if (!month && !year) return "—"
  const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const m = month ? monthNames[month] : ""
  const y = year ?? ""
  return [m, y].filter(Boolean).join("-")
}

export function StudentVisasSection({
  studentId,
  visas,
  referenceData,
}: StudentVisasSectionProps) {
  if (visas.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Visa Applications
            </CardTitle>
            <VisaDialog
              studentId={studentId}
              referenceData={referenceData}
              mode="create"
            />
          </div>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center">
            <Shield className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-foreground mb-1">No visa applications yet</h3>
            <p className="text-sm text-muted-foreground">
              Create a visa application to track the visa workflow
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
            <Shield className="h-4 w-4 text-muted-foreground" />
            Visa Applications ({visas.length})
          </CardTitle>
          <VisaDialog
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
                <TableHead className="pl-6 min-w-[180px]">School</TableHead>
                <TableHead>Entry Year</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead className="text-center w-10" title="Sent Request to Parent">SR</TableHead>
                <TableHead className="text-center w-10" title="Passport Received">PR</TableHead>
                <TableHead className="text-center w-10" title="Passport Sent to School">PS</TableHead>
                <TableHead className="text-center w-10" title="Sent Visa Information">SV</TableHead>
                <TableHead className="text-center w-10" title="CAS Received">CAS</TableHead>
                <TableHead className="text-center w-10" title="Visa Granted">VG</TableHead>
                <TableHead className="text-center w-10" title="Visa Copy">VC</TableHead>
                <TableHead className="text-center w-10" title="Visa Copy Sent">VCS</TableHead>
                <TableHead className="text-center w-10" title="Appointment">AP</TableHead>
                <TableHead>Appt. Date</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visas.map((visa) => {
                const style = statusStyles[visa.status?.code ?? "normal"] ?? statusStyles.normal

                return (
                  <TableRow key={visa.id}>
                    <TableCell className="pl-6 font-medium">
                      <span className="text-sm">{visa.school?.name ?? visa.application ?? "—"}</span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatEntryYear(visa.entry_month, visa.entry_year_value)}
                    </TableCell>
                    <TableCell>
                      {visa.status ? (
                        <Badge variant="outline" className={`${style} border text-xs font-medium whitespace-nowrap`}>
                          {visa.status.label}
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-center"><BoolIndicator value={visa.request_sent_to_parent} /></TableCell>
                    <TableCell className="text-center"><BoolIndicator value={visa.passport_received} /></TableCell>
                    <TableCell className="text-center"><BoolIndicator value={visa.passport_sent_to_school} /></TableCell>
                    <TableCell className="text-center"><BoolIndicator value={visa.sent_visa_information} /></TableCell>
                    <TableCell className="text-center"><BoolIndicator value={visa.cas_received} /></TableCell>
                    <TableCell className="text-center"><BoolIndicator value={visa.visa_granted} /></TableCell>
                    <TableCell className="text-center"><BoolIndicator value={visa.visa_copy} /></TableCell>
                    <TableCell className="text-center"><BoolIndicator value={visa.visa_copy_sent} /></TableCell>
                    <TableCell className="text-center"><BoolIndicator value={visa.appointment} /></TableCell>
                    <TableCell className="text-sm">{formatDate(visa.appointment_date)}</TableCell>
                    <TableCell className="text-sm">{formatDate(visa.updated_at)}</TableCell>
                    <TableCell className="pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <EditVisaButton
                          visa={visa}
                          studentId={studentId}
                          referenceData={referenceData}
                        />
                        <DeleteVisaButton
                          visaId={visa.id}
                          studentId={studentId}
                          schoolName={visa.school?.name ?? "this school"}
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
          Total: {visas.length} visa{visas.length !== 1 ? "s" : ""}
        </div>
      </CardContent>
    </Card>
  )
}
