"use client"

import { useState, useTransition } from "react"
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
import { BookingDrawer } from "@/components/scheduler/booking-drawer"
import { BookingStatusBadge } from "@/components/scheduler/booking-status-badge"
import { RecordNotesDialog } from "@/components/features/record-notes-dialog"

const statusMap: Record<number, { label: string; style: string }> = {
  1: { label: "To schedule", style: "bg-amber-50 text-amber-700 border-amber-200" },
  2: { label: "Confirmed", style: "bg-blue-50 text-blue-700 border-blue-200" },
  3: { label: "Completed", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  4: { label: "Cancelled", style: "bg-red-50 text-red-700 border-red-200" },
}

function formatDate(d: string | null) {
  if (!d) return null
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

/** One row of the exam list: scheduling state, score entry, booking link and notes. */
export function ExamManagementRow({ exam, link, canSchedule, notes, scoreColumn, returnTo }: {
  exam: ExamManagementRecord; link?: ExamBookingLink; canSchedule: boolean
  notes: { canWrite: boolean; currentUserId: string | null }; scoreColumn: boolean; returnTo: string
}) {
  const [isPending, startTransition] = useTransition()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const status = statusMap[exam.status_id] ?? statusMap[1]
  const studentName = [exam.student?.first_name, exam.student?.surname].filter(Boolean).join(" ")
  const canScore = exam.status_id === 2 || exam.status_id === 3

  const saveScore = (value: string) => {
    if (value === (exam.score?.toString() ?? "")) return
    startTransition(async () => {
      const result = await updateExamFields(exam.id, { score: value ? Number(value) : null })
      if (result.success) toast.success("Score saved")
      else toast.error(result.error ?? "Failed to update")
    })
  }

  const preferred = formatDate(exam.preferred_date)
  const booked = formatDate(exam.confirmed_date)
  const place = [exam.room, exam.seat_no != null ? `seat ${exam.seat_no}` : null].filter(Boolean).join(", ")

  return (
    <TableRow className={isPending ? "opacity-50" : ""}>
      <TableCell className="py-3 pl-4">
        <Link href={`/students/${exam.student_id}`} className="text-sm font-medium transition-colors hover:text-brand-navy">
          {studentName || "Unnamed student"}
        </Link>
        {exam.student?.student_code && <p className="font-mono text-xs text-muted-foreground">{exam.student.student_code}</p>}
      </TableCell>
      <TableCell className="text-sm">
        <span className="font-medium">{exam.subject || exam.exam_type?.label || "Exam"}</span>
        <p className="text-xs text-muted-foreground">
          {[exam.subject ? exam.exam_type?.label : null, exam.apply_year ? `${exam.apply_year} entry` : null].filter(Boolean).join(", ")}
        </p>
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
        {preferred ?? ""}
        {exam.preferred_start_time && <span className="ml-1 tabular-nums">{exam.preferred_start_time.slice(0, 5)}</span>}
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm">
        {booked ? (
          <>
            <span className="font-medium tabular-nums">{booked}</span>
            {exam.confirmed_start_time && <span className="ml-1 tabular-nums text-muted-foreground">{exam.confirmed_start_time.slice(0, 5)}</span>}
            {place && <p className="text-xs text-muted-foreground">{place}</p>}
          </>
        ) : <span className="text-muted-foreground">Not booked yet</span>}
      </TableCell>
      {scoreColumn && (
        <TableCell>
          {canScore ? (
            <Input type="number" aria-label="Score" className="h-8 w-[88px] text-sm" defaultValue={exam.score?.toString() ?? ""} placeholder="Score"
              onBlur={(e) => saveScore(e.target.value)} />
          ) : (
            <span className="text-sm font-medium">{exam.score ?? ""}</span>
          )}
        </TableCell>
      )}
      <TableCell>
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : (
          <Badge variant="outline" className={`${status.style} whitespace-nowrap border text-xs`}>{status.label}</Badge>
        )}
      </TableCell>
      <TableCell className="pr-4">
        <div className="flex items-center justify-end gap-1 whitespace-nowrap">
          {link && (
            <BookingStatusBadge asChild status={link.status} className="cursor-pointer text-[11px]">
              <button type="button" title="Open booking" onClick={() => setDrawerOpen(true)}>{link.status}</button>
            </BookingStatusBadge>
          )}
          {canSchedule && exam.status_id !== 3 && exam.status_id !== 4 && (
            <ScheduleBookingButton examId={exam.id} label={link ? "Reschedule" : "Schedule"} />
          )}
          <RecordNotesDialog compact target="exam" recordId={exam.id} title={[studentName, exam.subject].filter(Boolean).join(" · ") || "Exam"}
            canWrite={notes.canWrite} currentUserId={notes.currentUserId} />
        </div>
        {link && (
          <BookingDrawer bookingId={drawerOpen ? link.booking_id : null} onClose={() => setDrawerOpen(false)} canConfirm={notes.canWrite} returnTo={returnTo} />
        )}
      </TableCell>
    </TableRow>
  )
}
