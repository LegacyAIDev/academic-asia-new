import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/ui/panel'
import { canAccess, requireAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { getBooking } from '@/lib/supabase/queries/scheduler-bookings'
import { getBookingHistory } from '@/lib/supabase/queries/scheduler-history'
import { BookingDetails } from '@/components/scheduler/booking-details'
import { BookingHistoryList } from '@/components/scheduler/booking-history-list'
import { BookingActionBar } from '../../booking-action-bar'
import { returnLabel, safeReturnPath } from '@/lib/scheduler/return-path'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string | string[] }>
}

/** Standalone booking page so a booking can be opened in a new tab or shared by link. */
export default async function BookingPage({ params, searchParams }: PageProps) {
  await requireAccess(MODULES.SCHEDULER)
  const [{ id }, { from }] = await Promise.all([params, searchParams])

  const [booking, history, canConfirm] = await Promise.all([getBooking(id), getBookingHistory(id), canAccess(MODULES.EXAMS, ACCESS.WRITE)])
  if (!booking) notFound()
  const backHref = safeReturnPath(from, `/scheduler?date=${booking.local_date}`)

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="space-y-1">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link href={backHref}>
            <ArrowLeft className="mr-1 h-4 w-4" /> {returnLabel(backHref)}
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{booking.title}</h1>
      </div>

      <BookingActionBar booking={booking} canConfirm={canConfirm} />

      <Panel title="Details">
        <BookingDetails booking={booking} />
      </Panel>

      <Panel title="History">
        <BookingHistoryList history={history} />
      </Panel>
    </div>
  )
}
