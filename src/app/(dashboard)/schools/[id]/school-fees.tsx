"use client"

import { Fragment, useMemo, useState } from "react"
import { Panel, PanelEmpty } from "@/components/ui/panel"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { feesForYear, financialYearLabel, groupFeesForDisplay, listFinancialYears, sortFeesForDisplay } from "@/lib/schools/fee-years"
import { FeeDialog, EditFeeButton, DeleteFeeButton } from "./fee-dialog"
import type { SchoolFeeWithJoins } from "@/lib/supabase/queries/school-fees"
import type { FeeReferenceData } from "./fee-dialog"
import type { AttachmentRecord } from "@/lib/supabase/queries/record-attachments"

type SchoolFeesSectionProps = {
  schoolId: string
  fees: SchoolFeeWithJoins[]
  referenceData: FeeReferenceData
  attachmentsByFee?: Map<string, AttachmentRecord[]>
  canWrite?: boolean
}

function formatAmount(amount: string | null) {
  if (!amount) return "—"
  const num = parseFloat(amount)
  return isNaN(num) ? "—" : `£${num.toLocaleString("en-GB", { minimumFractionDigits: 2 })}`
}

export function SchoolFeesSection({
  schoolId,
  fees,
  referenceData,
  attachmentsByFee,
  canWrite = true,
}: SchoolFeesSectionProps) {
  const years = useMemo(() => listFinancialYears(fees), [fees])
  // Null until someone picks a year, so a fee added for a newer year becomes the default on refresh.
  const [picked, setPicked] = useState<string | null>(null)
  const year = picked === "all" || (picked && years.includes(picked)) ? picked : years[0] ?? "all"
  const groups = useMemo(() => groupFeesForDisplay(sortFeesForDisplay(feesForYear(fees, year)), year === "all"), [fees, year])
  const columnCount = canWrite ? 4 : 3

  if (fees.length === 0) {
    return (
      <Panel title="Fees">
        <PanelEmpty title="No fees recorded" action={canWrite && <FeeDialog schoolId={schoolId} referenceData={referenceData} mode="create" />}>
          Add fee information for this school
        </PanelEmpty>
      </Panel>
    )
  }

  return (
    <Panel title={<>Fees · {year === "all" ? "all years" : financialYearLabel(year)}</>} flush action={<><div className="flex items-center gap-2">
            <Select value={year} onValueChange={setPicked}>
              <SelectTrigger className="h-8 w-[150px] text-sm" aria-label="Financial year"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map(option => <SelectItem key={option} value={option}>{financialYearLabel(option)}</SelectItem>)}
                <SelectItem value="all">All years ({fees.length})</SelectItem>
              </SelectContent>
            </Select>
            {canWrite && <FeeDialog schoolId={schoolId} referenceData={referenceData} mode="create" />}
          </div></>}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4 min-w-[160px]">Description</TableHead>
                <TableHead className="min-w-[120px]">Years</TableHead>
                <TableHead className="min-w-[100px] text-right">Amount</TableHead>
                {canWrite && <TableHead className="pr-4 text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <Fragment key={group.key}>
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={columnCount} className="bg-muted/40 py-1.5 pl-4 text-xs font-medium text-foreground">
                      {group.label}<span className="ml-1.5 tabular-nums text-muted-foreground/70">{group.fees.length}</span>
                    </TableCell>
                  </TableRow>
                  {group.fees.map((fee) => (
                    <TableRow key={fee.id}>
                      <TableCell className="pl-4 text-sm">{fee.description || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fee.year_levels || "—"}</TableCell>
                      <TableCell className="text-right text-sm font-medium tabular-nums">{formatAmount(fee.amount)}</TableCell>
                      {canWrite && (
                        <TableCell className="pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <EditFeeButton
                              fee={fee}
                              schoolId={schoolId}
                              referenceData={referenceData}
                              attachments={attachmentsByFee?.get(fee.id) ?? []}
                              canWrite={canWrite}
                            />
                            <DeleteFeeButton feeId={fee.id} schoolId={schoolId} label={fee.description || "this fee"} />
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>
  )
}
