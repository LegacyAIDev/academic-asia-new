"use client"

import { useTransition } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { TableCell, TableRow } from "@/components/ui/table"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { updateExamFields } from "@/lib/supabase/actions/student-individual-exams"
import type { ExamManagementRecord } from "@/lib/supabase/queries/exam-management"
import type { ExamBookingLink } from "@/lib/supabase/queries/scheduler-exams"
import { ScheduleBookingButton } from "@/components/scheduler/schedule-booking-button"
import { bookingPageHref } from "@/lib/scheduler/return-path"
import { BookingStatusBadge } from "@/components/scheduler/booking-status-badge"
import { RecordNotesDialog } from "@/components/features/record-notes-dialog"

const statusMap: Record<number, { label: string; style: string }> = {
  1: { label: "Pending", style: "bg-amber-50 text-amber-700 border-amber-200" },
  2: { label: "Confirmed", style: "bg-blue-50 text-blue-700 border-blue-200" },
  3: { label: "Completed", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  4: { label: "Cancelled", style: "bg-red-50 text-red-700 border-red-200" },
}

function formatDate(d: string | null) {
  if (!d) return "—"
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
}

/** One row of the exam list: scheduling state, score entry, booking link and notes. */
export function ExamManagementRow({ exam, link, canSchedule, notes, returnTo }: {
  exam: ExamManagementRecord; link?: ExamBookingLink; canSchedule: boolean
  notes: { canWrite: boolean; currentUserId: string | null }; returnTo: string
}) {
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
      <TableCell>
        <div className="flex items-center gap-2">
          {link && (
            <BookingStatusBadge asChild status={link.status} className="text-[11px]">
              <Link href={bookingPageHref(link.booking_id, returnTo)} title="Open booking">{link.status}</Link>
            </BookingStatusBadge>
          )}
          {canSchedule && exam.status_id !== 3 && exam.status_id !== 4 && (
            <ScheduleBookingButton examId={exam.id} label={link ? "Reschedule" : "Schedule"} />
          )}
        </div>
      </TableCell>
      <TableCell className="pr-6">
        <RecordNotesDialog target="exam" recordId={exam.id} title={[studentName, exam.subject].filter(Boolean).join(" · ") || "Exam"}
          canWrite={notes.canWrite} currentUserId={notes.currentUserId} />
      </TableCell>
    </TableRow>
  )
}
