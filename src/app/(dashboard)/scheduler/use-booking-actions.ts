'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { confirmBooking, recordAttendance } from '@/lib/supabase/actions/scheduler-bookings'

type Result = { success: boolean; error?: string }

/**
 * Booking actions shared by the details panel and the right-click menu, so
 * both give the same feedback and refresh the calendar the same way.
 */
export function useBookingActions(onDone?: () => void) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const run = (action: () => Promise<Result>, successMessage: string) => {
    startTransition(async () => {
      const result = await action()
      if (!result.success) {
        toast.error(result.error ?? 'Something went wrong. Please try again.')
        return
      }
      toast.success(successMessage)
      router.refresh()
      onDone?.()
    })
  }

  return {
    isPending,
    confirm: (bookingId: string) => run(() => confirmBooking(bookingId), 'Booking confirmed'),
    recordAttendance: (bookingId: string, attendance: 'show_up' | 'no_show') =>
      run(
        () => recordAttendance(bookingId, attendance),
        attendance === 'show_up' ? 'Marked as showed up' : 'Marked as no show',
      ),
  }
}
