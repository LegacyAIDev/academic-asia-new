"use client"

import { useTransition } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { updateExamFields } from "@/lib/supabase/actions/student-individual-exams"
import type { ExamManagementRecord } from "@/lib/supabase/queries/exam-management"
import type { ExamBookingLink } from "@/lib/supabase/queries/scheduler-exams"
import { ScheduleBookingButton } from "@/components/scheduler/schedule-booking-button"
import { BookingStatusBadge } from "@/components/scheduler/booking-status-badge"

type Props = {
  exams: ExamManagementRecord[]
  links: Record<string, ExamBookingLink>
  canSchedule: boolean
  currentStatus?: number
  page: number
  totalPages: number
  totalCount: number
}

const statusMap: Record<number, { label: string; style: string }> = {
  1: { label: "Pending", style: "bg-amber-50 text-amber-700 border-amber-200" },
  2: { label: "Confirmed", style: "bg-blue-50 text-blue-700 border-blue-200" },
  3: { label: "Completed", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  4: { label: "Cancelled", style: "bg-red-50 text-red-700 border-red-200" },
}

const tabs = [
  { label: "All", value: undefined },
  { label: "Pending", value: 1 },
  { label: "Confirmed", value: 2 },
  { label: "Completed", value: 3 },
]

function buildUrl(status?: number, page?: number) {
  const params = new URLSearchParams()
  if (status) params.set("status", status.toString())
  if (page && page > 1) params.set("page", page.toString())
  const qs = params.toString()
  return qs ? `/exams?${qs}` : "/exams"
}

function formatDate(d: string | null) {
  if (!d) return "—"
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
}

/** Exam list: scheduling fields are read-only here and change only through the scheduler dialog. */
export function ExamManagementTable({ exams, links, canSchedule, currentStatus, page, totalPages, totalCount }: Props) {
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
              <TableHead className="min-w-[120px] pr-6">Booking</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                  No exams found for this filter.
                </TableCell>
              </TableRow>
            ) : (
              exams.map((exam) => <ExamRow key={exam.id} exam={exam} link={links[exam.id]} canSchedule={canSchedule} />)
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

function ExamRow({ exam, link, canSchedule }: { exam: ExamManagementRecord; link?: ExamBookingLink; canSchedule: boolean }) {
  const [isPending, startTransition] = useTransition()
  const status = statusMap[exam.status_id] ?? statusMap[1]
  const studentName = [exam.student?.first_name, exam.student?.surname].filter(Boolean).join(" ")
  const canScore = exam.status_id === 2 || exam.status_id === 3

  const saveScore = (value: string) => {
    startTransition(async () => {
      const result = await updateExamFields(exam.id, { score: value ? Number(value) : null })
      if (result.success) toast.success("Score saved")
      else toast.error(result.error ?? "Failed to update")
    })
  }

  return (
    <TableRow className={isPending ? "opacity-50" : ""}>
      <TableCell className="pl-6">
        <Link href={`/students/${exam.student_id}`} className="text-sm font-medium hover:text-primary transition-colors">
          {studentName || "—"}
        </Link>
        {exam.student?.student_code && (
          <code className="block text-[10px] text-muted-foreground font-mono">{exam.student.student_code}</code>
        )}
      </TableCell>
      <TableCell><Badge variant="secondary" className="text-xs">{exam.exam_type?.label ?? "—"}</Badge></TableCell>
      <TableCell className="text-sm">{exam.subject || "—"}</TableCell>
      <TableCell className="text-sm">{exam.apply_year || "—"}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDate(exam.preferred_date)}
        {exam.preferred_start_time && <span className="ml-1">{exam.preferred_start_time.slice(0, 5)}</span>}
      </TableCell>
      <TableCell className="text-sm">
        <span className="block font-medium tabular-nums">{formatDate(exam.confirmed_date)}</span>
        {exam.confirmed_start_time && (
          <span className="block text-xs text-muted-foreground tabular-nums">{exam.confirmed_start_time.slice(0, 5)}</span>
        )}
      </TableCell>
      <TableCell className="text-sm">{exam.room || "—"}</TableCell>
      <TableCell className="text-sm">{exam.seat_no ?? "—"}</TableCell>
      <TableCell>
        {canScore ? (
          <Input type="number" className="h-8 text-xs w-[70px]" defaultValue={exam.score?.toString() ?? ""} placeholder="Score"
            onBlur={(e) => saveScore(e.target.value)} />
        ) : (
          <span className="text-sm font-medium">{exam.score ?? "—"}</span>
        )}
      </TableCell>
      <TableCell>
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : (
          <Badge variant="outline" className={`${status.style} border text-xs`}>{status.label}</Badge>
        )}
      </TableCell>
      <TableCell className="pr-6">
        <div className="flex items-center gap-2">
          {link && (
            <BookingStatusBadge asChild status={link.status} className="text-[11px]">
              <Link href={`/scheduler/bookings/${link.booking_id}`} title="Open booking">{link.status}</Link>
            </BookingStatusBadge>
          )}
          {canSchedule && exam.status_id !== 3 && exam.status_id !== 4 && (
            <ScheduleBookingButton examId={exam.id} label={link ? "Reschedule" : "Schedule"} />
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}
