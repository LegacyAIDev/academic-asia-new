"use client"

import { Fragment, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Banknote } from "lucide-react"
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
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Banknote className="h-4 w-4 text-muted-foreground" />
              Fees
            </CardTitle>
            {canWrite && <FeeDialog schoolId={schoolId} referenceData={referenceData} mode="create" />}
          </div>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center">
            <Banknote className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-foreground mb-1">No fees recorded</h3>
            <p className="text-sm text-muted-foreground">
              Add fee information for this school
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
            <Banknote className="h-4 w-4 text-muted-foreground" />
            Fees · {year === "all" ? "all years" : financialYearLabel(year)}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={year} onValueChange={setPicked}>
              <SelectTrigger className="h-8 w-[150px] text-sm" aria-label="Financial year"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map(option => <SelectItem key={option} value={option}>{financialYearLabel(option)}</SelectItem>)}
                <SelectItem value="all">All years ({fees.length})</SelectItem>
              </SelectContent>
            </Select>
            {canWrite && <FeeDialog schoolId={schoolId} referenceData={referenceData} mode="create" />}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6 min-w-[160px]">Description</TableHead>
                <TableHead className="min-w-[120px]">Years</TableHead>
                <TableHead className="min-w-[100px] text-right">Amount</TableHead>
                {canWrite && <TableHead className="pr-6 text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <Fragment key={group.key}>
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={columnCount} className="bg-muted/40 py-1.5 pl-6 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.label}<span className="ml-1.5 tabular-nums text-muted-foreground/70">{group.fees.length}</span>
                    </TableCell>
                  </TableRow>
                  {group.fees.map((fee) => (
                    <TableRow key={fee.id}>
                      <TableCell className="pl-6 text-sm">{fee.description || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fee.year_levels || "—"}</TableCell>
                      <TableCell className="text-right text-sm font-medium tabular-nums">{formatAmount(fee.amount)}</TableCell>
                      {canWrite && (
                        <TableCell className="pr-6">
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
      </CardContent>
    </Card>
  )
}
