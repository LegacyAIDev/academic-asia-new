'use client'

import { useEffect, useState } from 'react'
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
import { getBookingDetailsAction, type BookingDetailsPayload } from '@/lib/supabase/actions/scheduler-details'
import { BookingActionBar } from './booking-action-bar'

type Selection = { id: string; props: CalendarEventProps }
type Loaded = { selection: Selection; payload?: BookingDetailsPayload; error?: string }

type Props = {
  selected: Selection | null
  onClose: () => void
  canWrite: boolean
  canConfirm: boolean
  onEdit: (initial: BookingFormInput, labels: Record<string, string>) => void
}

/** Side panel opened from a calendar card: booking facts, history and the actions the user may take. */
export function BookingDetailsSheet({ selected, onClose, canWrite, canConfirm, onEdit }: Props) {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const bookingId = selected?.props.bookingId ?? null

  // Every click on a card is a new selection object, so each opening loads fresh data.
  useEffect(() => {
    const id = selected?.props.bookingId
    if (!selected || !id) return
    let cancelled = false
    getBookingDetailsAction(id).then(result => {
      if (cancelled) return
      if (result.success && result.data) setLoaded({ selection: selected, payload: result.data })
      else setLoaded({ selection: selected, error: result.error ?? 'Failed to load booking' })
    })
    return () => {
      cancelled = true
    }
  }, [selected])

  // While the sheet slides out nothing is selected, so keep showing the last booking instead of
  // emptying the panel. A new selection only shows data that was loaded for it.
  const current = selected === null ? loaded : loaded?.selection === selected ? loaded : null
  const payload = current?.payload ?? null
  const error = current?.error ?? null

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
              <BookingActionBar booking={booking} canConfirm={canConfirm} onDone={onClose}>
                {canWrite && booking.status !== 'cancelled' && (
                  <Button size="sm" variant="ghost" className="h-9" onClick={() => onEdit(bookingDetailToFormInput(booking), bookingDetailPeopleLabels(booking))}>
                    Edit
                  </Button>
                )}
              </BookingActionBar>
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
