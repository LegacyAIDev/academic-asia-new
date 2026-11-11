"use client"

import Link from "next/link"
import { Panel, PanelEmpty } from "@/components/ui/panel"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import type { ExamManagementRecord, ExamStats } from "@/lib/supabase/queries/exam-management"
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
  stats: ExamStats
  /** Scheduled-date range chosen above the table; tabs and paging must not lose it. */
  range: { from: string | null; to: string | null }
  page: number
  totalPages: number
  totalCount: number
}

const tabs: { label: string; value?: number; count: keyof ExamStats }[] = [
  { label: "All", value: undefined, count: "total" },
  { label: "To schedule", value: 1, count: "pending" },
  { label: "Confirmed", value: 2, count: "confirmed" },
  { label: "Completed", value: 3, count: "completed" },
]

/** Exam list: scheduling fields are read-only here and change only through the scheduler dialog. */
export function ExamManagementTable({ exams, links, canSchedule, notes, currentStatus, stats, range, page, totalPages, totalCount }: Props) {
  const buildUrl = (status?: number, toPage?: number) => examListHref({ status, page: toPage, ...range })

  const scoreColumn = exams.some(exam => exam.score !== null || exam.status_id === 2 || exam.status_id === 3)

  return (
    <Panel
      title={
        <nav aria-label="Exam status" className="-my-1 flex flex-wrap items-center gap-1 font-normal">
          {tabs.map(tab => {
            const active = currentStatus === tab.value
            return (
              <Button key={tab.label} variant={active ? "secondary" : "ghost"} size="sm" className="h-8 gap-1.5 text-xs" asChild>
                <Link href={buildUrl(tab.value)} aria-current={active ? "page" : undefined}>
                  {tab.label}
                  <span className="tabular-nums text-muted-foreground">{stats[tab.count].toLocaleString()}</span>
                </Link>
              </Button>
            )
          })}
        </nav>
      }
      flush
    >
      {exams.length === 0 ? (
        <PanelEmpty title="No exams here">
          {range.from || range.to ? "Nothing booked on these dates. Clear the dates to see every exam." : "Exams are requested from a student's page, under Exams."}
        </PanelEmpty>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-[180px] pl-4">Student</TableHead>
                <TableHead className="min-w-[160px]">Exam</TableHead>
                <TableHead className="min-w-[110px]">Preferred</TableHead>
                <TableHead className="min-w-[130px]">Booked for</TableHead>
                {scoreColumn && <TableHead className="w-[110px]">Score</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead className="w-[1%] pr-4"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exams.map(exam => (
                <ExamManagementRow key={exam.id} exam={exam} link={links[exam.id]} canSchedule={canSchedule} notes={notes} scoreColumn={scoreColumn} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-3">
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
    </Panel>
  )
}
