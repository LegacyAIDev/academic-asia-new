import { canAccess, requireAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { getCurrentUser } from '@/lib/supabase/auth'
import { getCalendarItems } from '@/lib/supabase/queries/scheduler-bookings'
import { getBlockedTimeOccurrences, listBlockedTimes } from '@/lib/supabase/queries/scheduler-blocked-times'
import { getRooms } from '@/lib/supabase/queries/scheduler-rooms'
import { getStudentsByIds, listActiveStaff } from '@/lib/supabase/queries/scheduler-people'
import { personName } from '@/lib/scheduler/person-name'
import { parseSchedulerParams, visibleRange, type RawSearchParams } from '@/lib/scheduler/search-params'
import { SchedulerShell } from './scheduler-shell'

type PageProps = { searchParams: Promise<RawSearchParams> }

export default async function SchedulerPage({ searchParams }: PageProps) {
  await requireAccess(MODULES.SCHEDULER)

  const raw = await searchParams
  const params = parseSchedulerParams(raw)
  // The booking page's Edit opens the booking form here, on the booking's day.
  const editRaw = Array.isArray(raw.edit) ? raw.edit[0] : raw.edit
  const editBookingId = editRaw && /^[0-9a-f-]{36}$/i.test(editRaw) ? editRaw : null
  const range = visibleRange(params.date, params.mode)
  const user = await getCurrentUser()
  const me = user?.id ?? ''

  const profileIds = params.view === 'my' ? [me] : params.view === 'team' ? params.profileIds : []
  const studentIds = params.view === 'team' ? params.studentIds : []

  const roomsPromise = getRooms({ includeInactive: false })
  // Blocks are shading on the time grid, which the month view doesn't have. The
  // Rooms view shades them per room column, so with no room filter it waits for
  // the room list; the other views load them alongside everything else.
  const blockedPromise =
    params.mode === 'month'
      ? Promise.resolve([])
      : params.view === 'rooms' && params.roomIds.length === 0
        ? roomsPromise.then(allRooms => getBlockedTimeOccurrences({ ...range, roomIds: allRooms.map(room => room.id) }))
        : getBlockedTimeOccurrences({ ...range, profileIds, roomIds: params.view === 'rooms' ? params.roomIds : [] })

  const [items, blockedOccurrences, myBlockedTimes, rooms, staff, students, canWrite, canConfirm] = await Promise.all([
    getCalendarItems({
      from: range.from,
      to: range.to,
      profileIds,
      studentIds,
      types: params.types,
      roomIds: params.roomIds,
      status: params.status ?? undefined,
    }),
    blockedPromise,
    me ? listBlockedTimes({ profileId: me }) : [],
    roomsPromise,
    listActiveStaff(),
    getStudentsByIds(studentIds),
    canAccess(MODULES.SCHEDULER, ACCESS.WRITE),
    canAccess(MODULES.EXAMS, ACCESS.WRITE),
  ])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Scheduler</h1>
        <p className="mt-1 hidden text-sm text-muted-foreground sm:block">
          Meetings, exams and rooms for the whole team
        </p>
      </div>

      <SchedulerShell
        params={params}
        items={items}
        blockedOccurrences={blockedOccurrences}
        myBlockedTimes={myBlockedTimes}
        rooms={rooms}
        staff={staff}
        studentLabels={Object.fromEntries(students.map(student => [student.id, personName(student)]))}
        currentProfileId={me}
        canWrite={canWrite}
        canConfirm={canConfirm}
        editBookingId={canWrite ? editBookingId : null}
      />
    </div>
  )
}
