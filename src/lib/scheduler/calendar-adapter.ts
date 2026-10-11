import type { CalendarItem } from '@/lib/supabase/queries/scheduler-bookings'
import { colorForType } from './colors'

/**
 * Pure mapping from calendar rows to the shape the calendar component renders.
 * Keeping this free of library types makes it unit-testable and keeps
 * FullCalendar confined to one component.
 */

export type CalendarEventProps = {
  source: string
  sourceId: string
  bookingId: string | null
  bookingType: string
  status: string
  readOnly: boolean
  roomId: string | null
  roomLabel: string | null
  studentId: string | null
  examId: string | null
  personId?: string
}

export type CalendarEvent = {
  id: string
  title: string
  start: string
  end: string
  resourceId?: string
  color: string
  editable: boolean
  classNames: string[]
  extendedProps: CalendarEventProps
}

export type CalendarResource = { id: string; title: string; order?: number }

export type AdapterOptions = {
  colorBy: 'type' | 'person'
  personColors?: Record<string, string>
  /** Person id → resource key ("p:<id>" or "s:<id>") when every person gets a column. */
  personResources?: Record<string, string>
  resourceBy?: 'room' | 'person'
  canEdit?: boolean
}

/** Short room label for cards: "2F R203" when floor and number exist, else the room name. */
export function roomLabel(item: Pick<CalendarItem, 'floor' | 'room_number' | 'room_name'>): string | null {
  if (item.floor && item.room_number) return `${item.floor} ${item.room_number}`
  return item.room_name ?? null
}

export function eventLabel(item: CalendarItem): string {
  const room = roomLabel(item)
  const title = item.title ?? 'Untitled'
  return room ? `${title} · ${room}` : title
}

function baseEvent(item: CalendarItem, opts: AdapterOptions): Omit<CalendarEvent, 'id' | 'color'> {
  const readOnly = item.source !== 'booking'
  const bookingType = item.booking_type ?? 'other'
  const status = item.status ?? 'confirmed'
  const classNames = [`type-${bookingType}`]
  if (status === 'cancelled') classNames.push('is-cancelled')
  if (status === 'pending') classNames.push('is-pending')
  if (readOnly) classNames.push('is-readonly')

  return {
    title: eventLabel(item),
    start: item.start_at ?? '',
    end: item.end_at ?? '',
    resourceId: opts.resourceBy === 'room' ? item.room_id ?? undefined : undefined,
    editable: Boolean(opts.canEdit) && !readOnly && status !== 'cancelled',
    classNames,
    extendedProps: {
      source: item.source ?? 'booking',
      sourceId: item.source_id ?? '',
      bookingId: item.booking_id,
      bookingType,
      status,
      readOnly,
      roomId: item.room_id,
      roomLabel: roomLabel(item),
      studentId: item.student_id,
      examId: item.exam_id,
    },
  }
}

/**
 * One event per row, or one per selected person when the team view splits or
 * colours by person. A booking shared by two selected people appears once for each.
 */
export function toCalendarEvents(items: CalendarItem[], opts: AdapterOptions): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const selectedPeople =
    opts.resourceBy === 'person' ? opts.personResources : opts.colorBy === 'person' ? opts.personColors : undefined

  for (const item of items) {
    const base = baseEvent(item, opts)
    const key = `${item.source}:${item.source_id}`
    const typeColor = colorForType(base.extendedProps.bookingType)

    if (selectedPeople) {
      const people = [...item.attendee_profile_ids, ...item.attendee_student_ids, item.student_id ?? '']
        .filter(id => id && selectedPeople[id])
      for (const personId of new Set(people)) {
        events.push({
          ...base,
          id: `${key}:${personId}`,
          resourceId: opts.resourceBy === 'person' ? opts.personResources?.[personId] : base.resourceId,
          color: opts.colorBy === 'person' ? opts.personColors?.[personId] ?? typeColor : typeColor,
          extendedProps: { ...base.extendedProps, personId },
        })
      }
      continue
    }

    events.push({ ...base, id: key, color: typeColor })
  }

  return events
}

export function toRoomResources(
  rooms: { id: string; display_name: string; floor: string | null; room_number: string | null; sort_order?: number }[],
): CalendarResource[] {
  return rooms.map((room, index) => ({
    id: room.id,
    title: room.floor && room.room_number ? `${room.display_name} (${room.floor} ${room.room_number})` : room.display_name,
    order: room.sort_order ?? index,
  }))
}

/** One column per selected person, in the order they were picked. */
export function toPersonResources(people: { key: string; title: string }[]): CalendarResource[] {
  return people.map((person, index) => ({ id: person.key, title: person.title, order: index }))
}

/**
 * Field names FullCalendar v7 reads on an event: `color` and a space-separated
 * `className`. The v6 names (`backgroundColor`, `borderColor`, `classNames`)
 * are silently kept as custom data in v7, so colours and state classes would
 * never render.
 */
export function toEventInputFields(event: CalendarEvent) {
  return {
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    resourceId: event.resourceId,
    color: event.color,
    editable: event.editable,
    className: event.classNames.join(' '),
    extendedProps: event.extendedProps,
  }
}
