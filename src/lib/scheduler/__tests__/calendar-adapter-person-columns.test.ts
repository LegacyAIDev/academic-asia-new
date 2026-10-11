import { describe, it, expect } from 'vitest'
import { toCalendarEvents, toPersonResources } from '../calendar-adapter'
import { colorForType } from '../colors'
import { makeItem } from './calendar-item-fixture'

/** Person id -> resource key, as the team view builds it for the selected people. */
const personResources = {
  'profile-a': 'p:profile-a',
  'profile-b': 'p:profile-b',
  'student-c': 's:student-c',
}

const columns = { colorBy: 'type', resourceBy: 'person', personResources } as const

describe('toCalendarEvents - resourceBy person', () => {
  it('puts each selected person in their own column, staff and students alike', () => {
    const item = makeItem({ attendee_profile_ids: ['profile-a'], attendee_student_ids: ['student-c'] })
    const events = toCalendarEvents([item], columns)

    expect(events.map(e => e.resourceId).sort()).toEqual(['p:profile-a', 's:student-c'])
    expect(events.find(e => e.resourceId === 'p:profile-a')?.extendedProps.personId).toBe('profile-a')
    expect(events.find(e => e.resourceId === 's:student-c')?.extendedProps.personId).toBe('student-c')
  })

  it('colours events by booking type when colouring by type', () => {
    const item = makeItem({ booking_type: 'examination', attendee_profile_ids: ['profile-a'] })
    const [event] = toCalendarEvents([item], columns)
    expect(event.color).toBe(colorForType('examination'))
  })

  it('produces no event for people who are not selected', () => {
    const item = makeItem({ attendee_profile_ids: ['profile-z'], attendee_student_ids: ['student-z'], student_id: 'student-y' })
    expect(toCalendarEvents([item], columns)).toEqual([])
  })

  it('only draws the selected people when a booking mixes selected and other attendees', () => {
    const item = makeItem({ attendee_profile_ids: ['profile-a', 'profile-z'] })
    const events = toCalendarEvents([item], columns)
    expect(events).toHaveLength(1)
    expect(events[0].resourceId).toBe('p:profile-a')
  })

  it('draws a booking shared by two selected people once per person with distinct ids', () => {
    const item = makeItem({ attendee_profile_ids: ['profile-a', 'profile-b'] })
    const events = toCalendarEvents([item], columns)

    expect(events).toHaveLength(2)
    expect(new Set(events.map(e => e.id)).size).toBe(2)
    expect(events.map(e => e.id).sort()).toEqual(['booking:source-1:profile-a', 'booking:source-1:profile-b'])
    expect(events.every(e => e.extendedProps.bookingId === 'booking-1')).toBe(true)
    expect(events.every(e => e.start === item.start_at && e.end === item.end_at)).toBe(true)
  })

  it('counts the booking student as a person, once even if also an attendee', () => {
    const asStudent = toCalendarEvents([makeItem({ student_id: 'student-c' })], columns)
    expect(asStudent.map(e => e.resourceId)).toEqual(['s:student-c'])

    const both = toCalendarEvents([makeItem({ student_id: 'student-c', attendee_student_ids: ['student-c'] })], columns)
    expect(both).toHaveLength(1)
  })

  it('uses the person column instead of the room as the resource', () => {
    const item = makeItem({ room_id: 'room-9', attendee_profile_ids: ['profile-a'] })
    const [event] = toCalendarEvents([item], columns)
    expect(event.resourceId).toBe('p:profile-a')
    expect(event.extendedProps.roomId).toBe('room-9')
  })

  it('keeps editing rules per booking: editable for a confirmed booking, locked for cancelled and read-only rows', () => {
    const attendee = { attendee_profile_ids: ['profile-a'] }
    const editable = toCalendarEvents([makeItem(attendee)], { ...columns, canEdit: true })
    const cancelled = toCalendarEvents([makeItem({ ...attendee, status: 'cancelled' })], { ...columns, canEdit: true })
    const block = toCalendarEvents([makeItem({ ...attendee, source: 'external_block', source_id: 'ext-1' })], { ...columns, canEdit: true })

    expect(editable[0].editable).toBe(true)
    expect(cancelled[0].editable).toBe(false)
    expect(block[0].editable).toBe(false)
    expect(block[0].id).toBe('external_block:ext-1:profile-a')
  })

  it('produces no events at all when nobody is selected', () => {
    const item = makeItem({ attendee_profile_ids: ['profile-a'] })
    expect(toCalendarEvents([item], { colorBy: 'type', resourceBy: 'person', personResources: {} })).toEqual([])
  })

  it('falls back to one plain event per row when no person resources are given', () => {
    const item = makeItem({ attendee_profile_ids: ['profile-a', 'profile-b'] })
    const events = toCalendarEvents([item], { colorBy: 'type', resourceBy: 'person' })
    expect(events).toHaveLength(1)
    expect(events[0].id).toBe('booking:source-1')
    expect(events[0].resourceId).toBeUndefined()
  })
})

describe('toCalendarEvents - person columns with colour by person', () => {
  const personColors = { 'profile-a': '#111111', 'student-c': '#333333' }

  it('uses the person colour in each column', () => {
    const item = makeItem({ attendee_profile_ids: ['profile-a'], attendee_student_ids: ['student-c'] })
    const events = toCalendarEvents([item], { ...columns, colorBy: 'person', personColors })
    expect(events.find(e => e.resourceId === 'p:profile-a')?.color).toBe('#111111')
    expect(events.find(e => e.resourceId === 's:student-c')?.color).toBe('#333333')
  })

  it('falls back to the type colour for a person without an assigned colour', () => {
    const item = makeItem({ booking_type: 'consultation', attendee_profile_ids: ['profile-b'] })
    const [event] = toCalendarEvents([item], { ...columns, colorBy: 'person', personColors })
    expect(event.color).toBe(colorForType('consultation'))
  })
})

describe('toCalendarEvents - overlay colour by person still works', () => {
  it('leaves the resource unset and uses the person colour', () => {
    const item = makeItem({ attendee_profile_ids: ['profile-a'], room_id: 'room-9' })
    const [event] = toCalendarEvents([item], { colorBy: 'person', personColors: { 'profile-a': '#111111' } })
    expect(event.resourceId).toBeUndefined()
    expect(event.color).toBe('#111111')
    expect(event.extendedProps.personId).toBe('profile-a')
  })
})

describe('toPersonResources', () => {
  it('returns one column per person in the order given', () => {
    const resources = toPersonResources([
      { key: 'p:profile-b', title: 'Ben Lee' },
      { key: 's:student-c', title: 'Cara Yip' },
      { key: 'p:profile-a', title: 'Ann Ho' },
    ])
    expect(resources).toEqual([
      { id: 'p:profile-b', title: 'Ben Lee', order: 0 },
      { id: 's:student-c', title: 'Cara Yip', order: 1 },
      { id: 'p:profile-a', title: 'Ann Ho', order: 2 },
    ])
  })

  it('returns no columns for nobody', () => {
    expect(toPersonResources([])).toEqual([])
  })

  it('matches the resource keys events are placed in', () => {
    const resources = toPersonResources([{ key: 'p:profile-a', title: 'Ann Ho' }])
    const [event] = toCalendarEvents([makeItem({ attendee_profile_ids: ['profile-a'] })], columns)
    expect(resources.map(r => r.id)).toContain(event.resourceId)
  })
})
