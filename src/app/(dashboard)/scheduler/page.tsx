import { canAccess, requireAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { getCurrentUser } from '@/lib/supabase/auth'
import { getCalendarItems } from '@/lib/supabase/queries/scheduler-bookings'
import { getRooms } from '@/lib/supabase/queries/scheduler-rooms'
import { listActiveStaff } from '@/lib/supabase/queries/scheduler-people'
import { parseSchedulerParams, visibleRange, type RawSearchParams } from '@/lib/scheduler/search-params'
import { SchedulerShell } from './scheduler-shell'

type PageProps = { searchParams: Promise<RawSearchParams> }

export default async function SchedulerPage({ searchParams }: PageProps) {
  await requireAccess(MODULES.SCHEDULER)

  const params = parseSchedulerParams(await searchParams)
  const range = visibleRange(params.date, params.mode)
  const user = await getCurrentUser()
  const me = user?.id ?? ''

  const profileIds = params.view === 'my' ? [me] : params.view === 'team' ? params.profileIds : []
  const studentIds = params.view === 'team' ? params.studentIds : []

  const [items, rooms, staff, canWrite, canConfirm] = await Promise.all([
    getCalendarItems({
      from: range.from,
      to: range.to,
      profileIds,
      studentIds,
      types: params.types,
      roomIds: params.roomIds,
      status: params.status ?? undefined,
    }),
    getRooms({ includeInactive: false }),
    listActiveStaff(),
    canAccess(MODULES.SCHEDULER, ACCESS.WRITE),
    canAccess(MODULES.EXAMS, ACCESS.WRITE),
  ])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Scheduler</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Rooms, meetings and examination bookings for the whole team
        </p>
      </div>

      <SchedulerShell
        params={params}
        items={items}
        rooms={rooms}
        staff={staff}
        currentProfileId={me}
        canWrite={canWrite}
        canConfirm={canConfirm}
      />
    </div>
  )
}
