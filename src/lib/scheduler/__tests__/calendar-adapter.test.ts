import { describe, it, expect } from 'vitest'
import type { CalendarItem } from '@/lib/supabase/queries/scheduler-bookings'
import { eventLabel, roomLabel, toCalendarEvents, toRoomResources } from '../calendar-adapter'
import { colorForType } from '../colors'

/** Every nullable view column defaulted to null, so each test only sets what it needs. */
function makeItem(overrides: Partial<CalendarItem> = {}): CalendarItem {
  return {
    application_id: null,
    booking_id: 'booking-1',
    booking_type: 'internal_meeting',
    created_by: null,
    end_at: '2026-03-15T02:00:00.000Z',
    exam_id: null,
    floor: null,
    is_exclusive: null,
    local_date: '2026-03-15',
    location_name: null,
    location_type: null,
    notes: null,
    online_link: null,
    organiser_id: null,
    room_id: null,
    room_name: null,
    room_number: null,
    school_id: null,
    seats_required: null,
    source: 'booking',
    source_id: 'source-1',
    start_at: '2026-03-15T01:00:00.000Z',
    status: 'confirmed',
    student_id: null,
    title: 'Weekly sync',
    attendee_profile_ids: [],
    attendee_student_ids: [],
    ...overrides,
  }
}

describe('roomLabel', () => {
  it('combines floor + room number when both exist', () => {
    expect(roomLabel({ floor: '2F', room_number: 'R203', room_name: 'Big Room' })).toBe('2F R203')
  })

  it('falls back to the display name when floor or number is missing', () => {
    expect(roomLabel({ floor: null, room_number: 'R203', room_name: 'Big Room' })).toBe('Big Room')
    expect(roomLabel({ floor: '2F', room_number: null, room_name: 'Big Room' })).toBe('Big Room')
  })

  it('returns null when there is no room at all', () => {
    expect(roomLabel({ floor: null, room_number: null, room_name: null })).toBeNull()
  })
})

describe('eventLabel', () => {
  it('appends the room label when a room is present', () => {
    const item = makeItem({ floor: '2F', room_number: 'R203', room_name: null })
    expect(eventLabel(item)).toBe('Weekly sync · 2F R203')
  })

  it('falls back to "Untitled" when title is missing', () => {
    const item = makeItem({ title: null })
    expect(eventLabel(item)).toBe('Untitled')
  })

  it('omits the separator when there is no room', () => {
    const item = makeItem({ room_name: null, floor: null, room_number: null })
    expect(eventLabel(item)).toBe('Weekly sync')
  })
})

describe('toCalendarEvents - colour by type', () => {
  it('colours each event by its booking type', () => {
    const items = [makeItem({ booking_type: 'examination' }), makeItem({ booking_type: 'consultation', source_id: 'source-2' })]
    const events = toCalendarEvents(items, { colorBy: 'type' })
    expect(events).toHaveLength(2)
    expect(events[0].color).toBe(colorForType('examination'))
    expect(events[1].color).toBe(colorForType('consultation'))
  })

  it('falls back to the "other" colour for an unknown booking type', () => {
    const item = makeItem({ booking_type: 'made_up_type' })
    const events = toCalendarEvents([item], { colorBy: 'type' })
    expect(events[0].color).toBe(colorForType('other'))
  })

  it('one event per row, keyed by source:source_id', () => {
    const item = makeItem()
    const events = toCalendarEvents([item], { colorBy: 'type' })
    expect(events[0].id).toBe('booking:source-1')
  })
})

describe('toCalendarEvents - colour by person', () => {
  const personColors = { 'profile-a': '#111111', 'profile-b': '#222222' }

  it('expands one event per selected person', () => {
    const item = makeItem({ attendee_profile_ids: ['profile-a', 'profile-b'], attendee_student_ids: [] })
    const events = toCalendarEvents([item], { colorBy: 'person', personColors })
    expect(events).toHaveLength(2)
    const ids = events.map(e => e.id).sort()
    expect(ids).toEqual(['booking:source-1:profile-a', 'booking:source-1:profile-b'])
    expect(events.find(e => e.id === 'booking:source-1:profile-a')?.color).toBe('#111111')
    expect(events.every(e => e.extendedProps.personId)).toBeTruthy()
  })

  it('skips items with no selected person', () => {
    const item = makeItem({ attendee_profile_ids: ['profile-z'], attendee_student_ids: [] })
    const events = toCalendarEvents([item], { colorBy: 'person', personColors })
    expect(events).toHaveLength(0)
  })

  it('includes the booking student_id as a candidate person', () => {
    const item = makeItem({ student_id: 'profile-a', attendee_profile_ids: [], attendee_student_ids: [] })
    const events = toCalendarEvents([item], { colorBy: 'person', personColors })
    expect(events).toHaveLength(1)
    expect(events[0].extendedProps.personId).toBe('profile-a')
  })

  it('deduplicates a person appearing in multiple attendee lists', () => {
    const item = makeItem({ attendee_profile_ids: ['profile-a'], attendee_student_ids: [], student_id: 'profile-a' })
    const events = toCalendarEvents([item], { colorBy: 'person', personColors })
    expect(events).toHaveLength(1)
  })
})

describe('toCalendarEvents - resourceBy room', () => {
  it('sets resourceId to the room id when resourceBy is "room"', () => {
    const item = makeItem({ room_id: 'room-9' })
    const events = toCalendarEvents([item], { colorBy: 'type', resourceBy: 'room' })
    expect(events[0].resourceId).toBe('room-9')
  })

  it('leaves resourceId undefined without resourceBy', () => {
    const item = makeItem({ room_id: 'room-9' })
    const events = toCalendarEvents([item], { colorBy: 'type' })
    expect(events[0].resourceId).toBeUndefined()
  })
})

describe('toCalendarEvents - read-only and status classes', () => {
  it('is read-only for non-booking sources', () => {
    const item = makeItem({ source: 'external_block' })
    const events = toCalendarEvents([item], { colorBy: 'type', canEdit: true })
    expect(events[0].extendedProps.readOnly).toBe(true)
    expect(events[0].editable).toBe(false)
    expect(events[0].classNames).toContain('is-readonly')
  })

  it('adds is-cancelled class name and disables editing for cancelled bookings', () => {
    const item = makeItem({ status: 'cancelled' })
    const events = toCalendarEvents([item], { colorBy: 'type', canEdit: true })
    expect(events[0].classNames).toContain('is-cancelled')
    expect(events[0].editable).toBe(false)
  })

  it('adds is-pending class name for pending bookings', () => {
    const item = makeItem({ status: 'pending' })
    const events = toCalendarEvents([item], { colorBy: 'type', canEdit: true })
    expect(events[0].classNames).toContain('is-pending')
  })

  it('canEdit gates editable for an otherwise editable booking', () => {
    const item = makeItem({ status: 'confirmed', source: 'booking' })
    const withEdit = toCalendarEvents([item], { colorBy: 'type', canEdit: true })
    const withoutEdit = toCalendarEvents([item], { colorBy: 'type', canEdit: false })
    expect(withEdit[0].editable).toBe(true)
    expect(withoutEdit[0].editable).toBe(false)
  })
})

describe('toRoomResources', () => {
  it('combines display name with floor + room number', () => {
    const resources = toRoomResources([
      { id: 'r1', display_name: 'Big Room', floor: '2F', room_number: 'R203' },
    ])
    expect(resources[0].title).toBe('Big Room (2F R203)')
  })

  it('falls back to the display name when floor or number is missing', () => {
    const resources = toRoomResources([{ id: 'r1', display_name: 'Big Room', floor: null, room_number: null }])
    expect(resources[0].title).toBe('Big Room')
  })

  it('uses sort_order when present, else index', () => {
    const resources = toRoomResources([
      { id: 'r1', display_name: 'A', floor: null, room_number: null, sort_order: 5 },
      { id: 'r2', display_name: 'B', floor: null, room_number: null },
    ])
    expect(resources[0].order).toBe(5)
    expect(resources[1].order).toBe(1)
  })
})
