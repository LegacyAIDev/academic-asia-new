'use client'

import { ClipboardCopy, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isExamBooking } from '@/lib/scheduler/config'
import type { BookingDetail } from '@/lib/supabase/queries/scheduler-bookings'
import { copyBookingText } from './copy-booking'

/** "Copy details" for every booking plus "Copy for family" on examinations. */
export function BookingCopyButtons({ booking }: { booking: BookingDetail }) {
  return (
    <>
      <Button variant="ghost" size="sm" className="h-9" onClick={() => copyBookingText(booking, 'details')}>
        <ClipboardCopy className="mr-1 h-3.5 w-3.5" /> Copy details
      </Button>
      {isExamBooking(booking.booking_type) && (
        <Button variant="ghost" size="sm" className="h-9" onClick={() => copyBookingText(booking, 'family')}>
          <Users className="mr-1 h-3.5 w-3.5" /> Copy for family
        </Button>
      )}
    </>
  )
}
