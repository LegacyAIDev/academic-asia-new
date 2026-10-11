'use client'

import { useMemo } from 'react'
import type { CalendarItem } from '@/lib/supabase/queries/scheduler-bookings'
import type { SchedulerRoom } from '@/lib/supabase/queries/scheduler-rooms'
import type { SchedulerStaffOption } from '@/lib/supabase/queries/scheduler-people'
import { toCalendarEvents, toPersonResources, toRoomResources } from '@/lib/scheduler/calendar-adapter'
import { colorForIndex } from '@/lib/scheduler/colors'
import { personName } from '@/lib/scheduler/person-name'
import { fullCalendarViewType, usesPersonColumns, type SchedulerParams } from '@/lib/scheduler/search-params'

type Input = {
  params: SchedulerParams
  items: CalendarItem[]
  rooms: SchedulerRoom[]
  staff: SchedulerStaffOption[]
  studentLabels: Record<string, string>
  canWrite: boolean
}

type SelectedPerson = { id: string; key: string; title: string }

/**
 * Derives everything the calendar renders from the URL params and loaded rows:
 * the FullCalendar view, the events, and the columns (rooms in the Rooms view,
 * one per selected person in the Team day and week views).
 */
export function useCalendarModel({ params, items, rooms, staff, studentLabels, canWrite }: Input) {
  const personColumns = usesPersonColumns(params)

  const peopleLabels = useMemo(() => {
    const labels: Record<string, string> = { ...studentLabels }
    for (const person of staff) labels[person.id] = personName(person)
    return labels
  }, [staff, studentLabels])

  const people = useMemo<SelectedPerson[]>(() => {
    if (params.view !== 'team') return []
    return [
      ...params.profileIds.map(id => ({ id, key: `p:${id}`, title: peopleLabels[id] || 'Colleague' })),
      ...params.studentIds.map(id => ({ id, key: `s:${id}`, title: peopleLabels[id] || 'Student' })),
    ]
  }, [params.view, params.profileIds, params.studentIds, peopleLabels])

  const events = useMemo(
    () =>
      toCalendarEvents(items, {
        colorBy: params.view === 'team' && !personColumns ? 'person' : 'type',
        personColors: Object.fromEntries(people.map((person, index) => [person.id, colorForIndex(index)])),
        personResources: personColumns ? Object.fromEntries(people.map(person => [person.id, person.key])) : undefined,
        resourceBy: params.view === 'rooms' ? 'room' : personColumns ? 'person' : undefined,
        canEdit: canWrite,
      }),
    [items, params.view, personColumns, people, canWrite],
  )

  const resources = useMemo(() => {
    if (params.view === 'rooms') {
      const visible = params.roomIds.length ? rooms.filter(room => params.roomIds.includes(room.id)) : rooms
      return toRoomResources(visible)
    }
    return personColumns ? toPersonResources(people) : undefined
  }, [params.view, params.roomIds, rooms, personColumns, people])

  return { events, resources, people, peopleLabels, personColumns, viewType: fullCalendarViewType(params) }
}
