'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import type { CalendarItem } from '@/lib/supabase/queries/scheduler-bookings'
import type { SchedulerRoom } from '@/lib/supabase/queries/scheduler-rooms'
import type { SchedulerStaffOption } from '@/lib/supabase/queries/scheduler-people'
import { fullCalendarViewType, serialiseSchedulerParams, type SchedulerParams } from '@/lib/scheduler/search-params'
import { toCalendarEvents, toRoomResources, type CalendarEventProps } from '@/lib/scheduler/calendar-adapter'
import { colorForIndex } from '@/lib/scheduler/colors'
import type { BookingFormInput } from '@/lib/scheduler/booking-schema'
import { moveBooking } from '@/lib/supabase/actions/scheduler-bookings'
import type { EventMove, SelectedRange } from '@/components/scheduler/scheduler-calendar'
import { BookingDialog } from '@/components/scheduler/booking-dialog'
import { SchedulerToolbar } from './scheduler-toolbar'
import { SchedulerFilterBar } from './scheduler-filter-bar'
import { BookingDetailsSheet } from './booking-details-sheet'
import { MoveConfirmDialog } from './move-confirm-dialog'

const SchedulerCalendar = dynamic(() => import('@/components/scheduler/scheduler-calendar'), {
  ssr: false,
  loading: () => <div className="h-[60vh] animate-pulse rounded-lg bg-muted" />,
})

export type SchedulerShellProps = {
  params: SchedulerParams
  items: CalendarItem[]
  rooms: SchedulerRoom[]
  staff: SchedulerStaffOption[]
  currentProfileId: string
  canWrite: boolean
  canConfirm: boolean
}

type DialogState = { open: boolean; initial?: Partial<BookingFormInput>; peopleLabels?: Record<string, string> }
type SelectedItem = { id: string; props: CalendarEventProps }

/** Client state for the scheduler page: URL-driven params, selection, dialogs and drag moves. */
export function SchedulerShell({ params, items, rooms, staff, currentProfileId, canWrite, canConfirm }: SchedulerShellProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selected, setSelected] = useState<SelectedItem | null>(null)
  const [dialog, setDialog] = useState<DialogState>({ open: false })
  const [pendingMove, setPendingMove] = useState<EventMove | null>(null)

  const personColors = useMemo(() => {
    const ids = params.view === 'my' ? [currentProfileId] : [...params.profileIds, ...params.studentIds]
    return Object.fromEntries(ids.map((id, i) => [id, colorForIndex(i)]))
  }, [params.view, params.profileIds, params.studentIds, currentProfileId])

  const peopleLabels = useMemo(() => {
    const labels: Record<string, string> = {}
    for (const s of staff) labels[s.id] = `${s.first_name ?? ''} ${s.surname ?? ''}`.trim()
    return labels
  }, [staff])

  const events = useMemo(
    () =>
      toCalendarEvents(items, {
        colorBy: params.view === 'team' ? 'person' : 'type',
        personColors,
        resourceBy: params.view === 'rooms' ? 'room' : undefined,
        canEdit: canWrite,
      }),
    [items, params.view, personColors, canWrite],
  )

  const resources = useMemo(() => {
    if (params.view !== 'rooms') return undefined
    const visible = params.roomIds.length ? rooms.filter(r => params.roomIds.includes(r.id)) : rooms
    return toRoomResources(visible)
  }, [params.view, params.roomIds, rooms])

  const updateParams = (patch: Partial<SchedulerParams>) => {
    const next = { ...params, ...patch }
    startTransition(() => router.replace(`/scheduler?${serialiseSchedulerParams(next)}`))
  }

  const openCreate = (range?: SelectedRange) => {
    if (!canWrite) return
    setDialog({
      open: true,
      initial: {
        start_at: range?.start,
        end_at: range?.end,
        room_id: range?.resourceId ?? null,
        location_type: range?.resourceId ? 'room' : undefined,
      },
    })
  }

  const handleMove = async (reason: string) => {
    if (!pendingMove?.props.bookingId) return
    const result = await moveBooking(pendingMove.props.bookingId, {
      start_at: pendingMove.start,
      end_at: pendingMove.end,
      room_id: pendingMove.resourceId ?? pendingMove.props.roomId,
      reason,
    })
    if (!result.success) {
      pendingMove.revert()
      toast.error(result.error === 'CONFLICT' ? 'Someone on this booking is already busy at that time.' : result.error)
    } else {
      toast.success('Booking moved')
      router.refresh()
    }
    setPendingMove(null)
  }

  return (
    <div className="space-y-3">
      <SchedulerToolbar
        params={params}
        staff={staff}
        pending={isPending}
        canWrite={canWrite}
        onChange={updateParams}
        onNewBooking={() => openCreate()}
      />
      <SchedulerFilterBar params={params} rooms={rooms} staff={staff} onChange={updateParams} />

      <div className="rounded-xl border border-border bg-card p-2 shadow-sm sm:p-3">
        <SchedulerCalendar
          viewType={fullCalendarViewType(params)}
          date={params.date}
          events={events}
          resources={resources}
          editable={canWrite}
          onSelectRange={openCreate}
          onEventClick={(id, props) => setSelected({ id, props })}
          onEventMove={move => {
            if (!move.props.bookingId) return move.revert()
            setPendingMove(move)
          }}
        />
      </div>

      <BookingDetailsSheet
        selected={selected}
        onClose={() => setSelected(null)}
        canWrite={canWrite}
        canConfirm={canConfirm}
        onEdit={(initial, labels) => {
          setSelected(null)
          setDialog({ open: true, initial, peopleLabels: { ...peopleLabels, ...labels } })
        }}
      />

      <BookingDialog
        open={dialog.open}
        onOpenChange={open => setDialog(d => ({ ...d, open }))}
        initial={dialog.initial}
        peopleLabels={dialog.peopleLabels ?? peopleLabels}
        rooms={rooms}
        staff={staff}
        currentProfileId={currentProfileId}
        canConfirm={canConfirm}
        onSaved={() => router.refresh()}
      />

      <MoveConfirmDialog
        move={pendingMove}
        onCancel={() => {
          pendingMove?.revert()
          setPendingMove(null)
        }}
        onConfirm={handleMove}
      />
    </div>
  )
}
