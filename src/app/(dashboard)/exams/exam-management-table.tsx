"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import type { ExamManagementRecord } from "@/lib/supabase/queries/exam-management"
import type { ExamBookingLink } from "@/lib/supabase/queries/scheduler-exams"
import { examListHref } from "@/lib/exams/exam-page-search-params"
import { ExamManagementRow } from "./exam-management-row"

type Props = {
  exams: ExamManagementRecord[]
  links: Record<string, ExamBookingLink>
  canSchedule: boolean
  /** Exam notes: who is signed in, and whether they may add or change notes. */
  notes: { canWrite: boolean; currentUserId: string | null }
  currentStatus?: number
  /** Scheduled-date range chosen above the table; tabs and paging must not lose it. */
  range: { from: string | null; to: string | null }
  page: number
  totalPages: number
  totalCount: number
}

const tabs = [
  { label: "All", value: undefined },
  { label: "Pending", value: 1 },
  { label: "Confirmed", value: 2 },
  { label: "Completed", value: 3 },
]

/** Exam list: scheduling fields are read-only here and change only through the scheduler dialog. */
export function ExamManagementTable({ exams, links, canSchedule, notes, currentStatus, range, page, totalPages, totalCount }: Props) {
  const buildUrl = (status?: number, toPage?: number) => examListHref({ status, page: toPage, ...range })

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="border-b bg-muted/30 px-6 py-3">
        <div className="flex items-center gap-2">
          {tabs.map((tab) => (
            <Button key={tab.label} variant={currentStatus === tab.value ? "default" : "ghost"} size="sm" className="h-8 text-xs" asChild>
              <Link href={buildUrl(tab.value)}>{tab.label}</Link>
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/20">
              <TableHead className="pl-6 min-w-[180px]">Student</TableHead>
              <TableHead className="min-w-[100px]">Type</TableHead>
              <TableHead className="min-w-[100px]">Subject</TableHead>
              <TableHead className="min-w-[60px]">Year</TableHead>
              <TableHead className="min-w-[120px]">Preferred</TableHead>
              <TableHead className="min-w-[130px]">Scheduled</TableHead>
              <TableHead className="min-w-[90px]">Room</TableHead>
              <TableHead className="min-w-[60px]">Seat</TableHead>
              <TableHead className="min-w-[80px]">Score</TableHead>
              <TableHead className="min-w-[110px]">Status</TableHead>
              <TableHead className="min-w-[120px]">Booking</TableHead>
              <TableHead className="min-w-[90px] pr-6">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">
                  No exams found for this filter.
                </TableCell>
              </TableRow>
            ) : (
              exams.map((exam) => <ExamManagementRow key={exam.id} exam={exam} link={links[exam.id]} canSchedule={canSchedule} notes={notes} returnTo={buildUrl(currentStatus, page)} />)
            )}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-4">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium">{exams.length}</span> of <span className="font-medium">{totalCount.toLocaleString()}</span>
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
                {page > 1 ? <Link href={buildUrl(currentStatus, page - 1)}>Previous</Link> : <>Previous</>}
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} asChild={page < totalPages}>
                {page < totalPages ? <Link href={buildUrl(currentStatus, page + 1)}>Next</Link> : <>Next</>}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
