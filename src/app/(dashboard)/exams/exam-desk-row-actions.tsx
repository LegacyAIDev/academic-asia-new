"use client"

import Link from "next/link"
import { CalendarClock, FileText, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { RecordNotesDialog } from "@/components/features/record-notes-dialog"
import { useBookingActions } from "@/app/(dashboard)/scheduler/use-booking-actions"
import type { ExamDeskActions } from "@/lib/exams/exam-desk-rows"
import { ExamDeskPrintPapers } from "./exam-desk-print-papers"

type Props = {
  bookingId: string
  /** The candidate this row records attendance for; null records it for the whole booking. */
  studentId: string | null
  /** Decided on the server from the booking's state and the user's rights. */
  actions: ExamDeskActions
  /** Link to the booking's own page, or null when the user may not open the scheduler. */
  bookingHref: string | null
  /** True for the exam team when at least one chosen paper has a file or link to open. */
  canPrintPapers: boolean
  /** Address of the cover slip PDF, or null when the booking has no candidate to print one for. */
  coverSlipHref: string | null
  /** Set when the booking has an exam record to hang notes on. */
  notes: { examId: string; title: string; canWrite: boolean; currentUserId: string | null } | null
}

/**
 * Actions of one exam desk row on a single line: the next step as a button
 * (Confirm, or Showed up / No show), papers and notes as icons, the rest under
 * "⋯". Each row has its own instance, so only the row being saved is disabled.
 */
export function ExamDeskRowActions({ bookingId, studentId, actions, bookingHref, canPrintPapers, coverSlipHref, notes }: Props) {
  const { isPending, confirm, recordAttendance } = useBookingActions()

  const hasMore = Boolean(coverSlipHref || bookingHref)
  return (
    <div className="flex items-center justify-end gap-1 whitespace-nowrap">
      {/* The one thing to do next for this row comes first, as a button. */}
      {actions.confirm && (
        <Button size="sm" className="h-8" disabled={isPending} onClick={() => confirm(bookingId)}>Confirm</Button>
      )}
      {actions.showUp && (
        <Button size="sm" className="h-8" disabled={isPending} onClick={() => recordAttendance(bookingId, "show_up", studentId)}>Showed up</Button>
      )}
      {actions.noShow && (
        <Button size="sm" variant="outline" className="h-8" disabled={isPending} onClick={() => recordAttendance(bookingId, "no_show", studentId)}>
          No show
        </Button>
      )}
      {canPrintPapers && <ExamDeskPrintPapers bookingId={bookingId} compact />}
      {notes && (
        <RecordNotesDialog target="exam" recordId={notes.examId} title={notes.title}
          canWrite={notes.canWrite} currentUserId={notes.currentUserId} compact />
      )}
      {hasMore && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" aria-label="More actions"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {coverSlipHref && (
              <DropdownMenuItem asChild>
                {/* A plain link on purpose: a prefetching router link would start a PDF render nobody asked for. */}
                <a href={coverSlipHref} target="_blank" rel="noopener noreferrer"><FileText className="h-4 w-4" /> Cover slip</a>
              </DropdownMenuItem>
            )}
            {bookingHref && (
              <DropdownMenuItem asChild><Link href={bookingHref}><CalendarClock className="h-4 w-4" /> Open booking</Link></DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
