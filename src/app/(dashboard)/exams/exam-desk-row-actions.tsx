"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useBookingActions } from "@/app/(dashboard)/scheduler/use-booking-actions"
import type { ExamDeskActions } from "@/lib/exams/exam-desk-rows"

type Props = {
  bookingId: string
  /** Decided on the server from the booking's state and the user's rights. */
  actions: ExamDeskActions
  /** Link to the booking's own page, or null when the user may not open the scheduler. */
  bookingHref: string | null
}

/**
 * Buttons of one exam desk row. Each row has its own instance, so only the row
 * being saved is disabled while the request runs.
 */
export function ExamDeskRowActions({ bookingId, actions, bookingHref }: Props) {
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
      {bookingHref && (
        <Button size="sm" variant="outline" asChild>
          <Link href={bookingHref}>Open booking</Link>
        </Button>
      )}
    </div>
  )
}
