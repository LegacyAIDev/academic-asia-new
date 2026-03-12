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
import { CalendarSearch } from "lucide-react"
import { SchoolVisitDialog, EditSchoolVisitButton, DeleteSchoolVisitButton } from "./visit-dialog"
import type { SchoolVisitWithJoins } from "@/lib/supabase/queries/school-visits"

type SchoolVisitsSectionProps = {
  schoolId: string
  visits: SchoolVisitWithJoins[]
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function SchoolVisitsSection({ schoolId, visits }: SchoolVisitsSectionProps) {
  if (visits.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <CalendarSearch className="h-4 w-4 text-muted-foreground" />
              Visits
            </CardTitle>
            <SchoolVisitDialog schoolId={schoolId} mode="create" />
          </div>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center">
            <CalendarSearch className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-foreground mb-1">No visits recorded</h3>
            <p className="text-sm text-muted-foreground">
              Log a school visit to keep track of site tours and meetings
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
            <CalendarSearch className="h-4 w-4 text-muted-foreground" />
            Visits ({visits.length})
          </CardTitle>
          <SchoolVisitDialog schoolId={schoolId} mode="create" />
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6 min-w-[110px]">Date</TableHead>
                <TableHead className="min-w-[140px]">Contact</TableHead>
                <TableHead className="min-w-[240px]">Visit Log</TableHead>
                <TableHead className="min-w-[120px]">Result</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visits.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="pl-6">
                    <Badge variant="outline" className="text-xs font-medium whitespace-nowrap">
                      {formatDate(item.visit_date)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.school_contact || "—"}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.visit_log || item.remarks || "—"}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.result || "—"}
                  </TableCell>
                  <TableCell className="pr-6">
                    <div className="flex items-center justify-end gap-1">
                      <EditSchoolVisitButton
                        visit={item}
                        schoolId={schoolId}
                      />
                      <DeleteSchoolVisitButton
                        visitId={item.id}
                        schoolId={schoolId}
                        label={formatDate(item.visit_date)}
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
