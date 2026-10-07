import { requireAccess, canAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { getLocations, getRooms } from '@/lib/supabase/queries/scheduler-rooms'
import { RoomsTable } from './rooms-table'

/** Admin page for the rooms and locations that bookings/exams are scheduled into. */
export default async function SchedulerRoomsPage() {
  await requireAccess(MODULES.SCHEDULER)
  const canManage = await canAccess(MODULES.EXAMS, ACCESS.WRITE)

  const [rooms, locations] = await Promise.all([
    getRooms({ includeInactive: true }),
    getLocations({ includeInactive: true }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rooms</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage bookable rooms and the locations they belong to
        </p>
      </div>

      <RoomsTable rooms={rooms} locations={locations} canManage={canManage} />
    </div>
  )
}
