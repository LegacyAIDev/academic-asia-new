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
import { Landmark } from "lucide-react"
import { BankDetailDialog, EditBankDetailButton, DeleteBankDetailButton } from "./bank-detail-dialog"
import type { SchoolBankDetailWithJoins } from "@/lib/supabase/queries/school-bank-details"
import type { BankReferenceData } from "./bank-detail-dialog"

type SchoolBankDetailsSectionProps = {
  schoolId: string
  bankDetails: SchoolBankDetailWithJoins[]
  referenceData: BankReferenceData
}

export function SchoolBankDetailsSection({
  schoolId,
  bankDetails,
  referenceData,
}: SchoolBankDetailsSectionProps) {
  if (bankDetails.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Landmark className="h-4 w-4 text-muted-foreground" />
              Bank Details
            </CardTitle>
            <BankDetailDialog schoolId={schoolId} referenceData={referenceData} mode="create" />
          </div>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center">
            <Landmark className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-foreground mb-1">No bank details recorded</h3>
            <p className="text-sm text-muted-foreground">
              Add banking information for this school
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
            <Landmark className="h-4 w-4 text-muted-foreground" />
            Bank Details ({bankDetails.length})
          </CardTitle>
          <BankDetailDialog schoolId={schoolId} referenceData={referenceData} mode="create" />
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6 min-w-[120px]">Type</TableHead>
                <TableHead className="min-w-[80px]">Currency</TableHead>
                <TableHead className="min-w-[140px]">Bank</TableHead>
                <TableHead className="min-w-[140px]">Account Holder</TableHead>
                <TableHead className="min-w-[120px]">Account No.</TableHead>
                <TableHead className="min-w-[100px]">Sort Code</TableHead>
                <TableHead className="min-w-[120px]">SWIFT</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bankDetails.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="pl-6">
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
                    {item.account_number || "—"}
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    {item.sort_code || "—"}
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    {item.swift_code || "—"}
                  </TableCell>
                  <TableCell className="pr-6">
                    <div className="flex items-center justify-end gap-1">
                      <EditBankDetailButton
                        bankDetail={item}
                        schoolId={schoolId}
                        referenceData={referenceData}
                      />
                      <DeleteBankDetailButton
                        detailId={item.id}
                        schoolId={schoolId}
                        label={item.bank_name || "this"}
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
