"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useBookingActions } from "@/app/(dashboard)/scheduler/use-booking-actions"
import type { ExamDeskActions } from "@/lib/exams/exam-desk-rows"
import { ExamDeskPrintPapers } from "./exam-desk-print-papers"

type Props = {
  bookingId: string
  /** Decided on the server from the booking's state and the user's rights. */
  actions: ExamDeskActions
  /** Link to the booking's own page, or null when the user may not open the scheduler. */
  bookingHref: string | null
  /** True for the exam team when at least one chosen paper has a file or link to open. */
  canPrintPapers: boolean
  /** Address of the cover slip PDF, or null when the booking has no candidate to print one for. */
  coverSlipHref: string | null
}

/**
 * Buttons of one exam desk row. Each row has its own instance, so only the row
 * being saved is disabled while the request runs.
 */
export function ExamDeskRowActions({ bookingId, actions, bookingHref, canPrintPapers, coverSlipHref }: Props) {
  const { isPending, confirm, recordAttendance } = useBookingActions()

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {actions.confirm && (
        <Button size="sm" disabled={isPending} onClick={() => confirm(bookingId)}>Confirm</Button>
      )}
      {actions.showUp && (
        <Button size="sm" disabled={isPending} onClick={() => recordAttendance(bookingId, "show_up")}>Showed up</Button>
      )}
      {actions.noShow && (
        <Button size="sm" variant="ghost" disabled={isPending} onClick={() => recordAttendance(bookingId, "no_show")}>
          No show
        </Button>
      )}
      {canPrintPapers && <ExamDeskPrintPapers bookingId={bookingId} />}
      {coverSlipHref && (
        <Button size="sm" variant="outline" asChild>
          {/* A plain link on purpose: a prefetching router link would start a PDF render nobody asked for. */}
          <a href={coverSlipHref} target="_blank" rel="noopener noreferrer">Cover slip</a>
        </Button>
      )}
      {bookingHref && (
        <Button size="sm" variant="outline" asChild>
          <Link href={bookingHref}>Open booking</Link>
        </Button>
      )}
    </div>
  )
}
