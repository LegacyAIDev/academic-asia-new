'use client'

import { useEffect, useMemo, useRef } from 'react'
import Calendar, {
  type CalendarRef,
  type DateSelectInfo,
  type EventChangeInfo,
  type EventClickInfo,
  type EventInput,
} from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/react/daygrid'
import timeGridPlugin from '@fullcalendar/react/timegrid'
import interactionPlugin from '@fullcalendar/react/interaction'
import resourceTimeGridPlugin from '@fullcalendar/react-scheduler/resource-timegrid'
import monarchTheme from '@fullcalendar/react/themes/monarch'
import '@fullcalendar/react/skeleton.css'
import '@fullcalendar/react/themes/monarch/theme.css'
import '@fullcalendar/react/themes/monarch/palettes/blue.css'
import './scheduler-calendar.css'
import { DAY_END_TIME, DAY_START_TIME, FULLCALENDAR_LICENSE_KEY, SCHEDULER_TIMEZONE, SLOT_MINUTES } from '@/lib/scheduler/config'
import type { CalendarEvent, CalendarEventProps, CalendarResource } from '@/lib/scheduler/calendar-adapter'

export type SelectedRange = { start: string; end: string; resourceId?: string }

export type EventMove = {
  eventId: string
  props: CalendarEventProps
  start: string
  end: string
  resourceId?: string
  revert: () => void
}

export type SchedulerCalendarProps = {
  viewType: string
  /** YYYY-MM-DD in the business timezone. */
  date: string
  events: CalendarEvent[]
  resources?: CalendarResource[]
  editable: boolean
  onSelectRange?: (range: SelectedRange) => void
  onEventClick?: (eventId: string, props: CalendarEventProps) => void
  onEventMove?: (move: EventMove) => void
}

const PLUGINS = [dayGridPlugin, timeGridPlugin, interactionPlugin, resourceTimeGridPlugin, monarchTheme]

function toEventInput(event: CalendarEvent): EventInput {
  return {
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    resourceId: event.resourceId,
    backgroundColor: event.color,
    borderColor: event.color,
    editable: event.editable,
    classNames: event.classNames,
    extendedProps: event.extendedProps,
  }
}

/**
 * The only component that talks to FullCalendar. It renders whatever the
 * adapter produced and reports user interactions back as plain ISO strings.
 */
export default function SchedulerCalendar({
  viewType,
  date,
  events,
  resources,
  editable,
  onSelectRange,
  onEventClick,
  onEventMove,
}: SchedulerCalendarProps) {
  const ref = useRef<CalendarRef>(null)
  const eventInputs = useMemo(() => events.map(toEventInput), [events])

  useEffect(() => {
    const api = ref.current?.getApi()
    if (!api) return
    if (api.view.type !== viewType) api.changeView(viewType, date)
    else api.gotoDate(date)
  }, [viewType, date])

  const handleChange = (info: EventChangeInfo) => {
    const { event } = info
    if (!event.start || !event.end) return info.revert()
    const newResource = (info as { newResource?: { id: string } }).newResource
    onEventMove?.({
      eventId: event.id,
      props: event.extendedProps as CalendarEventProps,
      start: event.start.toISOString(),
      end: event.end.toISOString(),
      resourceId: newResource?.id,
      revert: info.revert,
    })
  }

  return (
    <div className="scheduler-calendar">
      <Calendar
        ref={ref}
        plugins={PLUGINS}
        schedulerLicenseKey={FULLCALENDAR_LICENSE_KEY}
        timeZone={SCHEDULER_TIMEZONE}
        initialView={viewType}
        initialDate={date}
        headerToolbar={false}
        height="auto"
        firstDay={1}
        allDaySlot={false}
        nowIndicator
        slotDuration={`00:${String(SLOT_MINUTES).padStart(2, '0')}:00`}
        slotMinTime="07:00:00"
        slotMaxTime="22:00:00"
        businessHours={{ daysOfWeek: [1, 2, 3, 4, 5, 6], startTime: DAY_START_TIME, endTime: DAY_END_TIME }}
        selectable={editable}
        selectMirror
        editable={editable}
        eventResizableFromStart
        dayMaxEvents={4}
        events={eventInputs}
        resources={resources ?? []}
        select={(info: DateSelectInfo) => {
          const resource = (info as { resource?: { id: string } }).resource
          onSelectRange?.({ start: info.start.toISOString(), end: info.end.toISOString(), resourceId: resource?.id })
          ref.current?.getApi().unselect()
        }}
        eventClick={(info: EventClickInfo) => {
          info.jsEvent.preventDefault()
          onEventClick?.(info.event.id, info.event.extendedProps as CalendarEventProps)
        }}
        eventDrop={handleChange}
        eventResize={handleChange}
      />
    </div>
  )
}
