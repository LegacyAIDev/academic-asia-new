"use client"

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
import { Check, Minus } from "lucide-react"
import { VisaDialog, EditVisaButton, DeleteVisaButton } from "./visa-dialog"
import type { VisaWithJoins } from "@/lib/supabase/queries/student-visas"
import type { VisaReferenceData } from "./visa-dialog"
import type { AttachmentRecord } from "@/lib/supabase/queries/record-attachments"

type StudentVisasSectionProps = {
  studentId: string
  visas: VisaWithJoins[]
  referenceData: VisaReferenceData
  attachmentsByVisa?: Map<string, AttachmentRecord[]>
  canWrite?: boolean
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
  attachmentsByVisa,
  canWrite = true,
}: StudentVisasSectionProps) {
  if (visas.length === 0) {
    return (
      <Panel title="Visas">
        <PanelEmpty title="No visa applications yet" action={canWrite ? (
          <VisaDialog
                studentId={studentId}
                referenceData={referenceData}
                mode="create"
              />
        ) : null}>
          Create a visa application to track the visa workflow
        </PanelEmpty>
      </Panel>
    )
  }

  return (
    <Panel title="Visas" count={visas.length} flush action={canWrite ? (
        <VisaDialog
              studentId={studentId}
              referenceData={referenceData}
              mode="create"
            />
      ) : null}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4 min-w-[180px]">School</TableHead>
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
                <TableHead className="pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visas.map((visa) => {
                const style = statusStyles[visa.status?.code ?? "normal"] ?? statusStyles.normal

                return (
                  <TableRow key={visa.id}>
                    <TableCell className="pl-4 font-medium">
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
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <EditVisaButton
                          visa={visa}
                          studentId={studentId}
                          referenceData={referenceData}
                          attachments={attachmentsByVisa?.get(visa.id) ?? []}
                          canWrite={canWrite}
                        />
                        {canWrite && (
                          <DeleteVisaButton
                            visaId={visa.id}
                            studentId={studentId}
                            schoolName={visa.school?.name ?? "this school"}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
    </Panel>
  )
}
