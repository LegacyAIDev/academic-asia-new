import Link from 'next/link'
import { ClipboardCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { canAccess } from '@/lib/permissions/guard'
import { MODULES } from '@/lib/permissions/modules'
import { getPendingExamBookings } from '@/lib/supabase/queries/scheduler-stats'

/** Dashboard alert for examination bookings still waiting for an officer's confirmation (spec NOT-01). */
export async function PendingExamBookingsCard() {
  if (!(await canAccess(MODULES.SCHEDULER))) return null
  const { count, earliestDate } = await getPendingExamBookings()
  // Exams always take place in a room, so the Rooms week of the earliest one shows them without picking people.
  const reviewHref = `/scheduler?view=rooms&mode=week&status=pending&types=examination,group_examination${earliestDate ? `&date=${earliestDate}` : ''}`

  return (
    <Card className={count > 0 ? 'border-amber-300/60' : undefined}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Exams awaiting confirmation</CardTitle>
        <ClipboardCheck className={`h-4 w-4 ${count > 0 ? 'text-amber-600' : 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{count}</div>
        <p className="text-xs text-muted-foreground">
          {count > 0 ? (
            <Link href={reviewHref} className="underline hover:text-primary">
              Review in the scheduler
            </Link>
          ) : (
            'All examination bookings are confirmed'
          )}
        </p>
      </CardContent>
    </Card>
  )
}
