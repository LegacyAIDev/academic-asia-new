'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { BookingDetails } from '@/components/scheduler/booking-details'
import { BookingDetailsRibbon } from '@/components/scheduler/booking-details-ribbon'
import { BookingHistoryList } from '@/components/scheduler/booking-history-list'
import { SectionEyebrow } from '@/components/scheduler/booking-form-section'
import type { CalendarEventProps } from '@/lib/scheduler/calendar-adapter'
import type { BookingFormInput } from '@/lib/scheduler/booking-schema'
import { bookingDetailPeopleLabels, bookingDetailToFormInput } from '@/lib/scheduler/booking-defaults'
import { confirmBooking, recordAttendance } from '@/lib/supabase/actions/scheduler-bookings'
import { getBookingDetailsAction, type BookingDetailsPayload } from '@/lib/supabase/actions/scheduler-details'

type Props = {
  selected: { id: string; props: CalendarEventProps } | null
  onClose: () => void
  canWrite: boolean
  canConfirm: boolean
  onEdit: (initial: BookingFormInput, labels: Record<string, string>) => void
}

/** Side panel opened from a calendar card: booking facts, history and the actions the user may take. */
export function BookingDetailsSheet({ selected, onClose, canWrite, canConfirm, onEdit }: Props) {
  const router = useRouter()
  const [loaded, setLoaded] = useState<{ id: string; payload?: BookingDetailsPayload; error?: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const bookingId = selected?.props.bookingId ?? null

  useEffect(() => {
    if (!bookingId) return
    let cancelled = false
    getBookingDetailsAction(bookingId).then(result => {
      if (cancelled) return
      if (result.success && result.data) setLoaded({ id: bookingId, payload: result.data })
      else setLoaded({ id: bookingId, error: result.error ?? 'Failed to load booking' })
    })
    return () => {
      cancelled = true
    }
  }, [bookingId])

  // Only trust data loaded for the booking currently selected; stale results are ignored.
  const current = loaded && loaded.id === bookingId ? loaded : null
  const payload = current?.payload ?? null
  const error = current?.error ?? null

  const handleConfirm = () => {
    if (!bookingId) return
    startTransition(async () => {
      const result = await confirmBooking(bookingId)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('Booking confirmed')
      router.refresh()
      onClose()
    })
  }

  const handleAttendance = (attendance: 'show_up' | 'no_show') => {
    if (!bookingId) return
    startTransition(async () => {
      const result = await recordAttendance(bookingId, attendance)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(attendance === 'show_up' ? 'Marked as showed up' : 'Marked as no show')
      router.refresh()
      onClose()
    })
  }

  const booking = payload?.booking
  const isReadOnly = selected?.props.readOnly ?? true

  return (
    <Sheet open={selected !== null} onOpenChange={open => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="pr-6">{booking?.title ?? 'Booking'}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-6">
          {isReadOnly && selected && (
            <div className="space-y-3">
              <BookingDetailsRibbon
                bookingType={selected.props.bookingType}
                status={selected.props.status}
                room={selected.props.roomLabel ? { display_name: selected.props.roomLabel, floor: null, room_number: null, capacity: 0 } : null}
              />
              <p className="text-sm text-muted-foreground">
                {selected.props.source === 'exam'
                  ? 'This exam was confirmed from the Exams page and has no scheduler booking yet.'
                  : 'This slot comes from an event schedule and is shown for reference.'}
              </p>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {bookingId && !payload && !error && <p className="text-sm text-muted-foreground">Loading…</p>}

          {booking && (
            <>
              <BookingDetails booking={booking} />
              <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border p-1.5">
                <Button asChild variant="ghost" size="sm" className="h-9">
                  <a href={`/scheduler/bookings/${booking.id}`}>
                    <ExternalLink className="mr-1 h-3.5 w-3.5" /> Open
                  </a>
                </Button>
                {canWrite && booking.status !== 'cancelled' && (
                  <Button size="sm" variant="ghost" className="h-9" onClick={() => onEdit(bookingDetailToFormInput(booking), bookingDetailPeopleLabels(booking))}>
                    Edit
                  </Button>
                )}
                {canConfirm && booking.status === 'pending' && (
                  <Button size="sm" className="h-9 ml-auto" onClick={handleConfirm} disabled={isPending}>Confirm</Button>
                )}
                {canConfirm && booking.status === 'confirmed' && !booking.attendance && (
                  <span className="ml-auto flex items-center gap-1.5">
                    <Button size="sm" variant="secondary" className="h-9" onClick={() => handleAttendance('show_up')} disabled={isPending}>Showed up</Button>
                    <Button size="sm" variant="ghost" className="h-9" onClick={() => handleAttendance('no_show')} disabled={isPending}>No show</Button>
                  </span>
                )}
                {booking.attendance && (
                  <span className="ml-auto px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {booking.attendance === 'show_up' ? 'Showed up' : 'No show'}
                  </span>
                )}
              </div>
              <Separator />
              <div>
                <SectionEyebrow className="mb-3">History</SectionEyebrow>
                <BookingHistoryList history={payload.history} />
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
