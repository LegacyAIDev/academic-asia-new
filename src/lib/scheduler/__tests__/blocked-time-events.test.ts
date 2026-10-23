import { describe, it, expect } from 'vitest'
import type { BlockedOccurrence } from '../blocked-times'
import { toBlockedTimeEvents, toEventInputFields } from '../calendar-adapter'

const lunch = (overrides: Partial<BlockedOccurrence> = {}): BlockedOccurrence => ({
  blockedTimeId: 'block-1',
  label: 'Lunch',
  profileId: 'profile-a',
  roomId: null,
  startAt: '2026-11-03T05:00:00.000Z',
  endAt: '2026-11-03T06:00:00.000Z',
  ...overrides,
})

describe('toBlockedTimeEvents', () => {
  it('draws a block as non-editable background shading with the label as title', () => {
    const [event] = toBlockedTimeEvents([lunch()], {})
    expect(event).toMatchObject({
      id: 'blocked:block-1:2026-11-03T05:00:00.000Z',
      title: 'Lunch',
      display: 'background',
      editable: false,
      classNames: ['is-blocked'],
    })
    expect(event.extendedProps).toMatchObject({ source: 'blocked_time', readOnly: true, bookingId: null })
    expect(event.resourceId).toBeUndefined()
  })

  it('gives each occurrence of one block its own id', () => {
    const events = toBlockedTimeEvents([lunch(), lunch({ startAt: '2026-11-04T05:00:00.000Z' })], {})
    expect(new Set(events.map(e => e.id)).size).toBe(2)
  })

  it('puts a room block in its room column', () => {
    const [event] = toBlockedTimeEvents([lunch({ profileId: null, roomId: 'room-1' })], { resourceBy: 'room' })
    expect(event.resourceId).toBe('room-1')
  })

  it('puts a staff block in the person column and skips people without one', () => {
    const personResources = { 'profile-a': 'p:profile-a' }
    const events = toBlockedTimeEvents([lunch(), lunch({ profileId: 'profile-z' })], { resourceBy: 'person', personResources })
    expect(events).toHaveLength(1)
    expect(events[0].resourceId).toBe('p:profile-a')
  })

  it('passes display through to the FullCalendar fields and drops the empty colour', () => {
    const fields = toEventInputFields(toBlockedTimeEvents([lunch()], {})[0])
    expect(fields.display).toBe('background')
    expect(fields.color).toBeUndefined()
    expect(fields.className).toBe('is-blocked')
  })
})

describe('toBlockedTimeEvents - resource views', () => {
  it('skips a room block in the person view and a staff block in the room view', () => {
    const roomBlock = lunch({ profileId: null, roomId: 'room-1' })
    const personResources = { 'profile-a': 'p:profile-a' }
    expect(toBlockedTimeEvents([roomBlock], { resourceBy: 'person', personResources })).toEqual([])
    expect(toBlockedTimeEvents([lunch()], { resourceBy: 'room' })).toEqual([])
  })

  it('keeps every block when the calendar has no columns', () => {
    const events = toBlockedTimeEvents([lunch(), lunch({ profileId: null, roomId: 'room-1' })], {})
    expect(events).toHaveLength(2)
    expect(events.every(e => e.resourceId === undefined)).toBe(true)
  })

  it('skips a person block when no person columns are known', () => {
    expect(toBlockedTimeEvents([lunch()], { resourceBy: 'person' })).toEqual([])
  })
})
