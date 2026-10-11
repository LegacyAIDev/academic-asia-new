'use client'

import { useState, useSyncExternalStore, type MouseEvent, type ReactNode } from 'react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { copyBookingById } from '@/components/scheduler/copy-booking'
import type { CalendarEvent } from '@/lib/scheduler/calendar-adapter'
import { canCancelBooking } from '@/lib/scheduler/booking-permissions'
import { isExamBooking } from '@/lib/scheduler/config'
import { bookingPageHref } from '@/lib/scheduler/return-path'
import { slotFromGridAttributes, type SlotSelection } from '@/lib/scheduler/selection-prefill'
import { formatHkDate, formatHkTime } from '@/lib/scheduler/time-utils'

type Target = { kind: 'event'; event: CalendarEvent } | { kind: 'slot'; slot: SlotSelection | null }

type Props = {
  children: ReactNode
  events: CalendarEvent[]
  canWrite: boolean
  canConfirm: boolean
  returnTo: string
  onOpenDetails: (event: CalendarEvent) => void
  onNewBooking: (slot?: SlotSelection) => void
  onEdit: (bookingId: string) => void
  onConfirm: (bookingId: string) => void
  onCancel: (bookingId: string) => void
  onToday: () => void
}

/** Reads the date, time and column under the pointer from FullCalendar's grid attributes. */
function slotAt(x: number, y: number): SlotSelection | null {
  try {
    const stack = document.elementsFromPoint(x, y)
    const attr = (name: string) => stack.map(el => el.getAttribute(name)).find((value): value is string => Boolean(value))
    return slotFromGridAttributes(attr('data-date'), attr('data-time'), attr('data-resource-id'))
  } catch {
    return null
  }
}

const COARSE_POINTER = '(pointer: coarse)'
const subscribePointer = (onChange: () => void) => {
  const query = window.matchMedia(COARSE_POINTER)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/**
 * Opening a dialog in the same tick as the menu closes can leave the page
 * unclickable (Radix focus/pointer lock), so actions run just after it closes.
 */
const afterMenuCloses = (action: () => void) => () => window.setTimeout(action, 0)

/** Right-click menu for bookings and empty slots on the scheduler calendar. */
export function CalendarContextMenu({ children, events, canWrite, canConfirm, returnTo, ...actions }: Props) {
  const [target, setTarget] = useState<Target | null>(null)
  // On touch screens a long press belongs to the calendar (select and drag), not to this menu.
  const coarsePointer = useSyncExternalStore(subscribePointer, () => window.matchMedia(COARSE_POINTER).matches, () => false)

  const captureTarget = (e: MouseEvent<HTMLDivElement>) => {
    const element = (e.target as HTMLElement).closest<HTMLElement>('[data-booking-key]')
    const event = element ? events.find(candidate => candidate.id === element.dataset.bookingKey) : undefined
    setTarget(event ? { kind: 'event', event } : { kind: 'slot', slot: slotAt(e.clientX, e.clientY) })
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild disabled={coarsePointer}>
        <div onContextMenuCapture={captureTarget}>{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-60">
        {target?.kind === 'event' ? (
          <EventItems event={target.event} canWrite={canWrite} canConfirm={canConfirm} returnTo={returnTo} {...actions} />
        ) : (
          <SlotItems slot={target?.slot ?? null} canWrite={canWrite} {...actions} />
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}

type EventItemsProps = Omit<Props, 'children' | 'events'> & { event: CalendarEvent }

function EventItems({ event, canWrite, canConfirm, returnTo, onOpenDetails, onEdit, onConfirm, onCancel }: EventItemsProps) {
  const { bookingId, status, bookingType } = event.extendedProps
  const active = status !== 'cancelled'
  const canCancel = canCancelBooking({ canWrite, canConfirm, status, bookingType })

  return (
    <>
      <ContextMenuLabel className="truncate text-xs text-muted-foreground">{event.title}</ContextMenuLabel>
      <ContextMenuItem onSelect={afterMenuCloses(() => onOpenDetails(event))}>Open details</ContextMenuItem>
      {bookingId && (
        <>
          <ContextMenuItem asChild>
            <a href={bookingPageHref(bookingId, returnTo)} target="_blank" rel="noreferrer">Open in new tab</a>
          </ContextMenuItem>
          {canWrite && active && <ContextMenuItem onSelect={afterMenuCloses(() => onEdit(bookingId))}>Edit…</ContextMenuItem>}
          {canConfirm && status === 'pending' && <ContextMenuItem onSelect={() => onConfirm(bookingId)}>Confirm</ContextMenuItem>}
          {canCancel && (
            <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={afterMenuCloses(() => onCancel(bookingId))}>
              Cancel booking…
            </ContextMenuItem>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={() => copyBookingById(bookingId, 'details')}>Copy details</ContextMenuItem>
          {isExamBooking(bookingType) && (
            <ContextMenuItem onSelect={() => copyBookingById(bookingId, 'family')}>Copy for family</ContextMenuItem>
          )}
        </>
      )}
    </>
  )
}

type SlotItemsProps = Pick<Props, 'canWrite' | 'onNewBooking' | 'onToday'> & { slot: SlotSelection | null }

function SlotItems({ slot, canWrite, onNewBooking, onToday }: SlotItemsProps) {
  return (
    <>
      {canWrite ? (
        <ContextMenuItem onSelect={afterMenuCloses(() => onNewBooking(slot ?? undefined))}>
          {slot ? `New booking on ${formatHkDate(slot.start)} at ${formatHkTime(slot.start)}` : 'New booking'}
        </ContextMenuItem>
      ) : (
        <ContextMenuLabel className="text-xs font-normal text-muted-foreground">
          View only. Ask a manager for Scheduler edit access to create bookings.
        </ContextMenuLabel>
      )}
      <ContextMenuItem onSelect={onToday}>Go to today</ContextMenuItem>
    </>
  )
}
