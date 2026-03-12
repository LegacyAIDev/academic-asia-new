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
import { Banknote } from "lucide-react"
import { FeeDialog, EditFeeButton, DeleteFeeButton } from "./fee-dialog"
import type { SchoolFeeWithJoins } from "@/lib/supabase/queries/school-fees"
import type { FeeReferenceData } from "./fee-dialog"

type SchoolFeesSectionProps = {
  schoolId: string
  fees: SchoolFeeWithJoins[]
  referenceData: FeeReferenceData
}

function formatAmount(amount: string | null) {
  if (!amount) return "—"
  const num = parseFloat(amount)
  return isNaN(num) ? "—" : `£${num.toLocaleString("en-GB", { minimumFractionDigits: 2 })}`
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

export function SchoolFeesSection({
  schoolId,
  fees,
  referenceData,
}: SchoolFeesSectionProps) {
  if (fees.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Banknote className="h-4 w-4 text-muted-foreground" />
              Fees
            </CardTitle>
            <FeeDialog schoolId={schoolId} referenceData={referenceData} mode="create" />
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
            Fees ({fees.length})
          </CardTitle>
          <FeeDialog schoolId={schoolId} referenceData={referenceData} mode="create" />
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6 min-w-[100px]">Year</TableHead>
                <TableHead className="min-w-[120px]">Fee Type</TableHead>
                <TableHead className="min-w-[120px]">Description</TableHead>
                <TableHead className="min-w-[120px]">Years</TableHead>
                <TableHead className="min-w-[100px] text-right">Amount</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fees.map((fee) => (
                <TableRow key={fee.id}>
                  <TableCell className="pl-6 font-medium text-sm">
                    {fee.financial_year || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-medium whitespace-nowrap">
                      {fee.fee_type?.label ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{fee.description || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {fee.year_levels || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-right font-medium">
                    {formatAmount(fee.amount)}
                  </TableCell>
                  <TableCell className="pr-6">
                    <div className="flex items-center justify-end gap-1">
                      <EditFeeButton
                        fee={fee}
                        schoolId={schoolId}
                        referenceData={referenceData}
                      />
                      <DeleteFeeButton
                        feeId={fee.id}
                        schoolId={schoolId}
                        label={fee.description || "this fee"}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
