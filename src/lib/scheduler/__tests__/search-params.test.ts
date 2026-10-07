import { describe, it, expect } from 'vitest'
import {
  parseSchedulerParams,
  serialiseSchedulerParams,
  visibleRange,
  fullCalendarViewType,
  todayInBusinessTz,
  type SchedulerParams,
} from '../search-params'

describe('parseSchedulerParams', () => {
  it('defaults to my/week/today with empty filters when nothing is given', () => {
    const now = new Date('2026-03-15T03:00:00.000Z') // 11:00 HKT
    const parsed = parseSchedulerParams({}, now)
    expect(parsed).toEqual({
      view: 'my',
      mode: 'week',
      date: '2026-03-15',
      profileIds: [],
      studentIds: [],
      types: [],
      roomIds: [],
      status: null,
    })
  })

  it('falls back to defaults for invalid view, mode and status', () => {
    const now = new Date('2026-03-15T03:00:00.000Z')
    const parsed = parseSchedulerParams({ view: 'bogus', mode: 'fortnight', status: 'archived' }, now)
    expect(parsed.view).toBe('my')
    expect(parsed.mode).toBe('week')
    expect(parsed.status).toBeNull()
  })

  it('accepts valid view, mode and status', () => {
    const parsed = parseSchedulerParams({ view: 'rooms', mode: 'day', status: 'confirmed' })
    expect(parsed.view).toBe('rooms')
    expect(parsed.mode).toBe('day')
    expect(parsed.status).toBe('confirmed')
  })

  it('falls back to today when date is malformed', () => {
    const now = new Date('2026-03-15T03:00:00.000Z')
    const parsed = parseSchedulerParams({ date: '15-03-2026' }, now)
    expect(parsed.date).toBe('2026-03-15')
  })

  it('keeps a well-formed date as-is', () => {
    const parsed = parseSchedulerParams({ date: '2026-01-01' })
    expect(parsed.date).toBe('2026-01-01')
  })

  it('splits people into profileIds (p:) and studentIds (s:)', () => {
    const parsed = parseSchedulerParams({ people: 'p:11111111-1111-4111-8111-111111111111,s:22222222-2222-4222-8222-222222222222,p:33333333-3333-4333-8333-333333333333' })
    expect(parsed.profileIds).toEqual(['11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333'])
    expect(parsed.studentIds).toEqual(['22222222-2222-4222-8222-222222222222'])
  })

  it('ignores people entries with no known prefix', () => {
    const parsed = parseSchedulerParams({ people: 'x:11111111-1111-4111-8111-111111111111,p:22222222-2222-4222-8222-222222222222' })
    expect(parsed.profileIds).toEqual(['22222222-2222-4222-8222-222222222222'])
    expect(parsed.studentIds).toEqual([])
  })

  it('filters types down to known booking types', () => {
    const parsed = parseSchedulerParams({ types: 'examination,bogus_type,internal_meeting' })
    expect(parsed.types).toEqual(['examination', 'internal_meeting'])
  })

  it('reads room ids as a plain comma list', () => {
    const parsed = parseSchedulerParams({ rooms: '44444444-4444-4444-8444-444444444444,55555555-5555-4555-8555-555555555555' })
    expect(parsed.roomIds).toEqual(['44444444-4444-4444-8444-444444444444', '55555555-5555-4555-8555-555555555555'])
  })

  it('drops ids that are not uuids so they never reach a database filter', () => {
    const parsed = parseSchedulerParams({ people: 'p:not-a-uuid,s:22222222-2222-4222-8222-222222222222', rooms: 'x,44444444-4444-4444-8444-444444444444' })
    expect(parsed.profileIds).toEqual([])
    expect(parsed.studentIds).toEqual(['22222222-2222-4222-8222-222222222222'])
    expect(parsed.roomIds).toEqual(['44444444-4444-4444-8444-444444444444'])
  })

  it('takes the first value when a param arrives as an array', () => {
    const parsed = parseSchedulerParams({ view: ['rooms', 'team'], date: ['2026-01-01', '2026-02-02'] })
    expect(parsed.view).toBe('rooms')
    expect(parsed.date).toBe('2026-01-01')
  })
})

describe('serialiseSchedulerParams', () => {
  const base: SchedulerParams = {
    view: 'my',
    mode: 'week',
    date: '2026-03-15',
    profileIds: [],
    studentIds: [],
    types: [],
    roomIds: [],
    status: null,
  }

  it('drops defaults, always keeps date', () => {
    const qs = serialiseSchedulerParams(base)
    expect(qs).toBe('date=2026-03-15')
  })

  it('round-trips through parseSchedulerParams for a fully populated state', () => {
    const params: SchedulerParams = {
      view: 'rooms',
      mode: 'day',
      date: '2026-05-20',
      profileIds: ['66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'],
      studentIds: ['88888888-8888-4888-8888-888888888888'],
      types: ['examination', 'consultation'],
      roomIds: ['44444444-4444-4444-8444-444444444444'],
      status: 'confirmed',
    }
    const qs = serialiseSchedulerParams(params)
    const search = new URLSearchParams(qs)
    const raw: Record<string, string> = {}
    for (const [k, v] of search.entries()) raw[k] = v
    expect(parseSchedulerParams(raw)).toEqual(params)
  })

  it('round-trips defaults', () => {
    const qs = serialiseSchedulerParams(base)
    const search = new URLSearchParams(qs)
    const raw: Record<string, string> = {}
    for (const [k, v] of search.entries()) raw[k] = v
    expect(parseSchedulerParams(raw)).toEqual(base)
  })
})

describe('visibleRange', () => {
  it('day mode returns the same date for from and to', () => {
    expect(visibleRange('2026-03-15', 'day')).toEqual({ from: '2026-03-15', to: '2026-03-15' })
  })

  it('week mode starts on Monday and spans 7 days', () => {
    // 2026-03-15 is a Sunday in HKT
    expect(visibleRange('2026-03-15', 'week')).toEqual({ from: '2026-03-09', to: '2026-03-15' })
  })

  it('week mode anchored on a Monday keeps that Monday as the start', () => {
    expect(visibleRange('2026-03-16', 'week')).toEqual({ from: '2026-03-16', to: '2026-03-22' })
  })

  it('month mode overflows into neighbouring months for the grid', () => {
    // March 2026 starts on a Sunday and ends on a Tuesday
    expect(visibleRange('2026-03-15', 'month')).toEqual({ from: '2026-02-23', to: '2026-04-05' })
  })

  it('month mode produces a 5-week grid when the month fits', () => {
    // February 2026 starts on a Sunday and has 28 days
    expect(visibleRange('2026-02-10', 'month')).toEqual({ from: '2026-01-26', to: '2026-03-01' })
  })

  it('month mode produces a 6-week grid when the month needs it', () => {
    // November 2026 starts on a Sunday and needs a 6th row
    expect(visibleRange('2026-11-10', 'month')).toEqual({ from: '2026-10-26', to: '2026-12-06' })
  })
})

describe('fullCalendarViewType', () => {
  const p = (overrides: Partial<SchedulerParams>): SchedulerParams => ({
    view: 'my',
    mode: 'week',
    date: '2026-03-15',
    profileIds: [],
    studentIds: [],
    types: [],
    roomIds: [],
    status: null,
    ...overrides,
  })

  it('rooms + day -> resourceTimeGridDay', () => {
    expect(fullCalendarViewType(p({ view: 'rooms', mode: 'day' }))).toBe('resourceTimeGridDay')
  })

  it('rooms + week -> resourceTimeGridWeek', () => {
    expect(fullCalendarViewType(p({ view: 'rooms', mode: 'week' }))).toBe('resourceTimeGridWeek')
  })

  it('rooms + month -> resourceTimeGridWeek (rooms view has no month grid)', () => {
    expect(fullCalendarViewType(p({ view: 'rooms', mode: 'month' }))).toBe('resourceTimeGridWeek')
  })

  it('non-rooms + month -> dayGridMonth', () => {
    expect(fullCalendarViewType(p({ view: 'team', mode: 'month' }))).toBe('dayGridMonth')
  })

  it('non-rooms + day -> timeGridDay', () => {
    expect(fullCalendarViewType(p({ view: 'my', mode: 'day' }))).toBe('timeGridDay')
  })

  it('non-rooms + week -> timeGridWeek', () => {
    expect(fullCalendarViewType(p({ view: 'my', mode: 'week' }))).toBe('timeGridWeek')
  })
})

describe('todayInBusinessTz', () => {
  it('renders the HKT date even when UTC has already rolled to the next day', () => {
    // 2026-03-15 23:30 HKT == 2026-03-15 15:30 UTC; check a time close to UTC midnight boundary instead
    const now = new Date('2026-03-15T20:00:00.000Z') // 2026-03-16 04:00 HKT
    expect(todayInBusinessTz(now)).toBe('2026-03-16')
  })
})
