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
import { BookingCopyButtons } from '@/components/scheduler/booking-copy-buttons'
import { returnLabel, safeReturnPath } from '@/lib/scheduler/return-path'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string | string[] }>
}

/** Standalone booking page so a booking can be opened in a new tab or shared by link. */
export default async function BookingPage({ params, searchParams }: PageProps) {
  await requireAccess(MODULES.SCHEDULER)
  const [{ id }, { from }] = await Promise.all([params, searchParams])

  const [booking, history] = await Promise.all([getBooking(id), getBookingHistory(id)])
  if (!booking) notFound()
  const backHref = safeReturnPath(from, `/scheduler?date=${booking.local_date}`)

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center gap-1">
        <Button asChild variant="ghost" size="sm">
          <Link href={backHref}>
            <ArrowLeft className="mr-1 h-4 w-4" /> {returnLabel(backHref)}
          </Link>
        </Button>
        <div className="ml-auto flex items-center gap-1">
          <BookingCopyButtons booking={booking} />
        </div>
      </div>

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
