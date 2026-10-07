import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireAccess } from '@/lib/permissions/guard'
import { MODULES } from '@/lib/permissions/modules'
import { getBooking } from '@/lib/supabase/queries/scheduler-bookings'
import { getBookingHistory } from '@/lib/supabase/queries/scheduler-history'
import { BookingDetails } from '@/components/scheduler/booking-details'
import { BookingHistoryList } from '@/components/scheduler/booking-history-list'

type PageProps = { params: Promise<{ id: string }> }

/** Standalone booking page so a booking can be opened in a new tab or shared by link. */
export default async function BookingPage({ params }: PageProps) {
  await requireAccess(MODULES.SCHEDULER)
  const { id } = await params

  const [booking, history] = await Promise.all([getBooking(id), getBookingHistory(id)])
  if (!booking) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/scheduler?date=${booking.local_date}&mode=day`}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to calendar
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{booking.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <BookingDetails booking={booking} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent>
          <BookingHistoryList history={history} />
        </CardContent>
      </Card>
    </div>
  )
}
