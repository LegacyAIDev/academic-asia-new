import { requireAccess, canAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { listBlockedTimes } from '@/lib/supabase/queries/scheduler-blocked-times'
import { getLocations, getRooms } from '@/lib/supabase/queries/scheduler-rooms'
import type { BlockedTime } from '@/lib/scheduler/blocked-times'
import { RoomsTable } from './rooms-table'

/** Admin page for the rooms and locations that bookings/exams are scheduled into. */
export default async function SchedulerRoomsPage() {
  await requireAccess(MODULES.SCHEDULER)
  const canManage = await canAccess(MODULES.EXAMS, ACCESS.WRITE)

  const [rooms, locations] = await Promise.all([
    getRooms({ includeInactive: true }),
    getLocations({ includeInactive: true }),
  ])
  const blocks = await listBlockedTimes({ roomIds: rooms.map(room => room.id) })
  const blocksByRoom: Record<string, BlockedTime[]> = {}
  for (const block of blocks) {
    if (block.room_id) (blocksByRoom[block.room_id] ??= []).push(block)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rooms</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage bookable rooms and the locations they belong to
        </p>
      </div>

      <RoomsTable rooms={rooms} locations={locations} blocksByRoom={blocksByRoom} canManage={canManage} />
    </div>
  )
}
