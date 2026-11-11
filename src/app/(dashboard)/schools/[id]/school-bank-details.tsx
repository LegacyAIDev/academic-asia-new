"use client"

import { useState } from "react"
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
import { BankDetailDialog, EditBankDetailButton, DeleteBankDetailButton } from "./bank-detail-dialog"
import type { SchoolBankDetailWithJoins } from "@/lib/supabase/queries/school-bank-details"
import type { BankReferenceData } from "./bank-detail-dialog"
import type { AttachmentRecord } from "@/lib/supabase/queries/record-attachments"

type SchoolBankDetailsSectionProps = {
  schoolId: string
  bankDetails: SchoolBankDetailWithJoins[]
  referenceData: BankReferenceData
  attachmentsByDetail?: Map<string, AttachmentRecord[]>
  canWrite?: boolean
}

export function SchoolBankDetailsSection({
  schoolId,
  bankDetails,
  referenceData,
  attachmentsByDetail,
  canWrite = true,
}: SchoolBankDetailsSectionProps) {
  if (bankDetails.length === 0) {
    return (
      <Panel title="Bank details">
        <PanelEmpty title="No bank details recorded" action={canWrite && <BankDetailDialog schoolId={schoolId} referenceData={referenceData} mode="create" />}>
          Add banking information for this school
        </PanelEmpty>
      </Panel>
    )
  }

  return (
    <Panel title="Bank details" flush action={<>{canWrite && <BankDetailDialog schoolId={schoolId} referenceData={referenceData} mode="create" />}</>}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4 min-w-[120px]">Type</TableHead>
                <TableHead className="min-w-[80px]">Currency</TableHead>
                <TableHead className="min-w-[140px]">Bank</TableHead>
                <TableHead className="min-w-[140px]">Account Holder</TableHead>
                <TableHead className="min-w-[120px]">Account No.</TableHead>
                <TableHead className="min-w-[100px]">Sort Code</TableHead>
                <TableHead className="min-w-[120px]">SWIFT</TableHead>
                {canWrite && <TableHead className="pr-4 text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {bankDetails.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="pl-4">
                    <Badge variant="outline" className="text-xs font-medium whitespace-nowrap">
                      {item.account_type?.label ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {item.currency?.code ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {item.bank_name || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.account_holder || "—"}
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    {item.account_number ? <MaskedNumber value={item.account_number} /> : "—"}
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    {item.sort_code || "—"}
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    {item.swift_code || "—"}
                  </TableCell>
                  {canWrite && (
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <EditBankDetailButton
                          bankDetail={item}
                          schoolId={schoolId}
                          referenceData={referenceData}
                          attachments={attachmentsByDetail?.get(item.id) ?? []}
                          canWrite={canWrite}
                        />
                        <DeleteBankDetailButton
                          detailId={item.id}
                          schoolId={schoolId}
                          label={item.bank_name || "this"}
                        />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>
  )
}

/** An account number shown as its last four digits until someone asks to see it. */
function MaskedNumber({ value }: { value: string }) {
  const [shown, setShown] = useState(false)
  const digits = value.replace(/\s/g, "")
  return (
    <span className="inline-flex items-center gap-2 tabular-nums">
      {shown || digits.length <= 4 ? value : `•••• ${digits.slice(-4)}`}
      {digits.length > 4 && (
        <button type="button" onClick={() => setShown(v => !v)} className="text-xs font-medium text-brand-navy hover:underline">
          {shown ? "Hide" : "Show"}
        </button>
      )}
    </span>
  )
}
