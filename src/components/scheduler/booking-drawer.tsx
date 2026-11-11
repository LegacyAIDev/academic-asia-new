'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { BookingDetails } from '@/components/scheduler/booking-details'
import { BookingHistoryList } from '@/components/scheduler/booking-history-list'
import { BookingActionBar } from '@/app/(dashboard)/scheduler/booking-action-bar'
import { bookingPageHref } from '@/lib/scheduler/return-path'
import { getBookingDetailsAction, type BookingDetailsPayload } from '@/lib/supabase/actions/scheduler-details'

type Loaded = { id: string; payload?: BookingDetailsPayload; error?: string }

/**
 * A booking in a side drawer, opened from pages outside the calendar (the exam
 * desk, All exams): its facts, the next step and its history, without leaving the page.
 */
export function BookingDrawer({ bookingId, onClose, canConfirm, returnTo }: {
  /** The booking to show; null closes the drawer. */
  bookingId: string | null
  onClose: () => void
  canConfirm: boolean
  /** Page the full booking page should lead back to. */
  returnTo: string
}) {
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  useEffect(() => {
    if (!bookingId) return
    let cancelled = false
    getBookingDetailsAction(bookingId).then(result => {
      if (cancelled) return
      setLoaded(result.success && result.data
        ? { id: bookingId, payload: result.data }
        : { id: bookingId, error: result.error ?? 'Failed to load booking' })
    })
    return () => {
      cancelled = true
    }
  }, [bookingId])

  // Keep the last booking on screen while the drawer slides out.
  const current = bookingId === null || loaded?.id === bookingId ? loaded : null
  const booking = current?.payload?.booking

  return (
    <Sheet open={bookingId !== null} onOpenChange={open => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="pr-6">{booking?.title ?? 'Booking'}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-6">
          {current?.error && <p className="text-sm text-destructive">{current.error}</p>}
          {!current && <p className="text-sm text-muted-foreground">Loading…</p>}
          {booking && current?.payload && (
            <>
              <BookingDetails booking={booking} />
              <BookingActionBar booking={booking} canConfirm={canConfirm} onDone={onClose}>
                <Button asChild variant="ghost" size="sm" className="h-9">
                  <Link href={bookingPageHref(booking.id, returnTo)}>
                    <ExternalLink className="mr-1 h-3.5 w-3.5" /> Open full page
                  </Link>
                </Button>
              </BookingActionBar>
              <Separator />
              <div>
                <h3 className="mb-3 text-sm font-semibold">History</h3>
                <BookingHistoryList history={current.payload.history} />
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
