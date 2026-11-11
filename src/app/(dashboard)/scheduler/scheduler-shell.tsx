'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import type { CalendarItem } from '@/lib/supabase/queries/scheduler-bookings'
import type { SchedulerRoom } from '@/lib/supabase/queries/scheduler-rooms'
import type { SchedulerStaffOption } from '@/lib/supabase/queries/scheduler-people'
import { schedulerHref, todayInBusinessTz, type SchedulerParams } from '@/lib/scheduler/search-params'
import type { BlockedOccurrence, BlockedTime } from '@/lib/scheduler/blocked-times'
import type { CalendarEvent, CalendarEventProps } from '@/lib/scheduler/calendar-adapter'
import type { BookingFormInput } from '@/lib/scheduler/booking-schema'
import { bookingDetailPeopleLabels, bookingDetailToFormInput } from '@/lib/scheduler/booking-defaults'
import { prefillFromSelection, slotForDay, type SlotSelection } from '@/lib/scheduler/selection-prefill'
import { moveBooking } from '@/lib/supabase/actions/scheduler-bookings'
import { getBookingDetailsAction } from '@/lib/supabase/actions/scheduler-details'
import type { EventMove } from '@/components/scheduler/scheduler-calendar'
import { BookingDialog } from '@/components/scheduler/booking-dialog'
import { BookingCancelDialog } from '@/components/scheduler/booking-cancel-dialog'
import { BlockedTimesSheet } from '@/components/scheduler/blocked-times-sheet'
import { SchedulerToolbar } from './scheduler-toolbar'
import { SchedulerFilterBar } from './scheduler-filter-bar'
import { PeoplePicker } from './people-picker'
import { BookingDetailsSheet } from './booking-details-sheet'
import { MoveConfirmDialog } from './move-confirm-dialog'
import { CalendarContextMenu } from './calendar-context-menu'
import { useCalendarModel } from './use-calendar-model'
import { useBookingActions } from './use-booking-actions'
import { useRouterWithProgress } from '@/components/layout/navigation-progress'

const SchedulerCalendar = dynamic(() => import('@/components/scheduler/scheduler-calendar'), {
  ssr: false,
  loading: () => <div className="h-[60vh] animate-pulse rounded-lg bg-muted" />,
})

export type SchedulerShellProps = {
  params: SchedulerParams
  items: CalendarItem[]
  blockedOccurrences: BlockedOccurrence[]
  myBlockedTimes: BlockedTime[]
  rooms: SchedulerRoom[]
  staff: SchedulerStaffOption[]
  studentLabels: Record<string, string>
  currentProfileId: string
  canWrite: boolean
  canConfirm: boolean
  /** Opens this booking's form on arrival (Edit on the booking page). */
  editBookingId?: string | null
}

type DialogState = { open: boolean; initial?: Partial<BookingFormInput>; peopleLabels?: Record<string, string> }
type SelectedItem = { id: string; props: CalendarEventProps }

const WIDE_TEAM_WEEK = 5

/** Client state for the scheduler page: URL-driven params, selection, dialogs and drag moves. */
export function SchedulerShell({ params, items, blockedOccurrences, myBlockedTimes, rooms, staff, studentLabels, currentProfileId, canWrite, canConfirm, editBookingId }: SchedulerShellProps) {
  const router = useRouterWithProgress()
  const [isPending, startTransition] = useTransition()
  const [selected, setSelected] = useState<SelectedItem | null>(null)
  const [dialog, setDialog] = useState<DialogState>({ open: false })
  const [pendingMove, setPendingMove] = useState<EventMove | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [blockedOpen, setBlockedOpen] = useState(false)
  const actions = useBookingActions()
  const model = useCalendarModel({ params, items, blockedOccurrences, rooms, staff, studentLabels, canWrite })
  const returnTo = schedulerHref(params)
  const teamWithoutPeople = params.view === 'team' && model.people.length === 0

  const updateParams = (patch: Partial<SchedulerParams>) => {
    startTransition(() => router.replace(schedulerHref({ ...params, ...patch })))
  }

  const openCreate = (slot?: SlotSelection) => {
    if (!canWrite) return
    // Without a picked slot, the booking starts on the day the calendar is showing.
    const picked = slot ?? slotForDay(params.date) ?? undefined
    setDialog({ open: true, initial: prefillFromSelection(picked, params.view, currentProfileId), peopleLabels: model.peopleLabels })
  }

  const openEdit = async (bookingId: string) => {
    const result = await getBookingDetailsAction(bookingId)
    if (!result.success || !result.data) return toast.error(result.error ?? 'Could not load the booking')
    const { booking } = result.data
    setDialog({ open: true, initial: bookingDetailToFormInput(booking), peopleLabels: { ...model.peopleLabels, ...bookingDetailPeopleLabels(booking) } })
  }

  // Seven days do not fit a phone: start it on the day instead (once, so Week can still be chosen).
  const phoneChecked = useRef(false)
  useEffect(() => {
    if (phoneChecked.current) return
    phoneChecked.current = true
    if (params.mode === 'week' && window.matchMedia('(max-width: 639px)').matches) updateParams({ mode: 'day' })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Open the requested booking once, then drop ?edit= so a refresh does not reopen it.
  const editHandled = useRef(false)
  useEffect(() => {
    if (!editBookingId || editHandled.current) return
    editHandled.current = true
    router.replace(returnTo)
    void openEdit(editBookingId)
  }, [editBookingId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMove = async (reason: string) => {
    if (!pendingMove?.props.bookingId) return
    const result = await moveBooking(pendingMove.props.bookingId, {
      start_at: pendingMove.start,
      end_at: pendingMove.end,
      room_id: params.view === 'rooms' ? pendingMove.resourceId ?? pendingMove.props.roomId : pendingMove.props.roomId,
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
      <SchedulerToolbar params={params} staff={staff} pending={isPending} canWrite={canWrite} onChange={updateParams} onNewBooking={() => openCreate()} onBlockedTimes={() => setBlockedOpen(true)}>
        <SchedulerFilterBar params={params} rooms={rooms} staff={staff} onChange={updateParams} />
      </SchedulerToolbar>

      {!teamWithoutPeople && !model.events.some(event => event.extendedProps.source !== 'blocked_time') && (
        <p className="text-sm text-muted-foreground">
          Nothing booked {params.mode === 'day' ? 'on this day' : params.mode === 'week' ? 'this week' : 'this month'}.
          {canWrite ? ' Drag across the calendar to book a time, or use New booking.' : ''}
        </p>
      )}

      <div>
        {teamWithoutPeople ? (
          <div className="flex h-[40vh] rounded-lg border bg-card flex-col items-center justify-center gap-3 text-center">
            <div className="space-y-1">
              <p className="text-sm font-medium">Choose colleagues or students to compare their calendars</p>
              <p className="text-sm text-muted-foreground">Each person gets their own column in Day and Week.</p>
            </div>
            <PeoplePicker
              staff={staff}
              profileIds={params.profileIds}
              studentIds={params.studentIds}
              onChange={(profileIds, studentIds) => updateParams({ profileIds, studentIds })}
            />
          </div>
        ) : (
          <>
            {model.personColumns && params.mode === 'week' && model.people.length > WIDE_TEAM_WEEK && (
              <p className="px-1 pb-2 text-xs text-muted-foreground">Tip: switch to Day to compare more than {WIDE_TEAM_WEEK} people comfortably.</p>
            )}
            <CalendarContextMenu
              events={model.events}
              canWrite={canWrite}
              canConfirm={canConfirm}
              returnTo={returnTo}
              onOpenDetails={(event: CalendarEvent) => setSelected({ id: event.id, props: event.extendedProps })}
              onNewBooking={openCreate}
              onEdit={openEdit}
              onConfirm={actions.confirm}
              onCancel={setCancelId}
              onToday={() => updateParams({ date: todayInBusinessTz() })}
            >
              <SchedulerCalendar
                viewType={model.viewType}
                date={params.date}
                events={model.events}
                resources={model.resources}
                editable={canWrite}
                datesAboveResources={model.personColumns && params.mode === 'week'}
                resourceEditable={params.view === 'rooms'}
                onSelectRange={openCreate}
                onEventClick={(id, props) => props.source !== 'blocked_time' && setSelected({ id, props })}
                onEventMove={move => (move.props.bookingId ? setPendingMove(move) : move.revert())}
              />
            </CalendarContextMenu>
          </>
        )}
      </div>

      <BookingDetailsSheet
        selected={selected}
        onClose={() => setSelected(null)}
        canWrite={canWrite}
        canConfirm={canConfirm}
        onEdit={(initial, labels) => {
          setSelected(null)
          setDialog({ open: true, initial, peopleLabels: { ...model.peopleLabels, ...labels } })
        }}
      />

      {canWrite && (
        <BlockedTimesSheet
          open={blockedOpen}
          onOpenChange={setBlockedOpen}
          subject={{ kind: 'profile' }}
          blocks={myBlockedTimes}
        />
      )}

      <BookingDialog
        open={dialog.open}
        onOpenChange={open => setDialog(d => ({ ...d, open }))}
        initial={dialog.initial}
        peopleLabels={dialog.peopleLabels ?? model.peopleLabels}
        rooms={rooms}
        staff={staff}
        currentProfileId={currentProfileId}
        canConfirm={canConfirm}
        onSaved={() => router.refresh()}
      />

      {cancelId && (
        <BookingCancelDialog
          bookingId={cancelId}
          open
          onOpenChange={open => !open && setCancelId(null)}
          onCancelled={() => {
            setCancelId(null)
            router.refresh()
          }}
        />
      )}

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
