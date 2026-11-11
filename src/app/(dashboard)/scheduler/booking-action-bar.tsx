'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { BookingCopyButtons } from '@/components/scheduler/booking-copy-buttons'
import { isExamBooking } from '@/lib/scheduler/config'
import type { BookingDetail } from '@/lib/supabase/queries/scheduler-bookings'
import { useBookingActions } from './use-booking-actions'

/**
 * What can be done with a booking, in one bar: links passed in first (Open,
 * Edit), the copy buttons, then the next step (Confirm, or Showed up / No show)
 * on the right. Shared by the calendar drawer, the exam pages and the booking page.
 */
export function BookingActionBar({ booking, canConfirm, onDone, children }: {
  booking: BookingDetail
  canConfirm: boolean
  /** Runs after an action succeeds, e.g. to close the drawer. */
  onDone?: () => void
  children?: ReactNode
}) {
  const { isPending, confirm, recordAttendance } = useBookingActions(onDone)

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border p-1.5">
        {children}
        <BookingCopyButtons booking={booking} />
        {canConfirm && booking.status === 'pending' && (
          <Button size="sm" className="ml-auto h-9" onClick={() => confirm(booking.id)} disabled={isPending}>Confirm</Button>
        )}
        {canConfirm && booking.status === 'confirmed' && !booking.attendance && (
          <span className="ml-auto flex items-center gap-1.5">
            <Button size="sm" className="h-9" onClick={() => recordAttendance(booking.id, 'show_up')} disabled={isPending}>Showed up</Button>
            <Button size="sm" variant="outline" className="h-9" onClick={() => recordAttendance(booking.id, 'no_show')} disabled={isPending}>No show</Button>
          </span>
        )}
        {booking.attendance && (
          <span className="ml-auto px-2 text-xs font-medium text-muted-foreground">
            {booking.attendance === 'show_up' ? 'Showed up' : 'No show'}
          </span>
        )}
      </div>
      {isExamBooking(booking.booking_type) && booking.status !== 'cancelled' && !booking.attendance && (
        <p className="text-xs text-muted-foreground">
          {booking.status === 'pending'
            ? 'The examination team confirms this exam. On the day, record attendance here: Showed up completes the exam in All exams.'
            : 'On the day, record attendance: Showed up completes the exam in All exams; No show leaves it open to rebook.'}
        </p>
      )}
    </div>
  )
}
