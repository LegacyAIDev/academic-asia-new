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
import { SchoolVisitDialog, EditSchoolVisitButton, DeleteSchoolVisitButton } from "./visit-dialog"
import type { SchoolVisitWithJoins } from "@/lib/supabase/queries/school-visits"

type SchoolVisitsSectionProps = {
  schoolId: string
  visits: SchoolVisitWithJoins[]
  /** Add, edit and delete are shown only to staff who may change school data. */
  canWrite?: boolean
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function SchoolVisitsSection({ schoolId, visits, canWrite = true }: SchoolVisitsSectionProps) {
  if (visits.length === 0) {
    return (
      <Panel title="Visits">
        <PanelEmpty title="No visits recorded" action={canWrite && <SchoolVisitDialog schoolId={schoolId} mode="create" />}>
          Log a school visit to keep track of site tours and meetings
        </PanelEmpty>
      </Panel>
    )
  }

  return (
    <Panel title="Visits" flush action={<>{canWrite && <SchoolVisitDialog schoolId={schoolId} mode="create" />}</>}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4 min-w-[110px]">Date</TableHead>
                <TableHead className="min-w-[140px]">Contact</TableHead>
                <TableHead className="min-w-[240px]">Visit Log</TableHead>
                <TableHead className="min-w-[120px]">Result</TableHead>
                {canWrite && <TableHead className="pr-4 text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visits.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="pl-4">
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
                  {canWrite && (
                    <TableCell className="pr-4">
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
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>
  )
}
