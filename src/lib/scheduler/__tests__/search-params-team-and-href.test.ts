import { describe, it, expect } from 'vitest'
import {
  fullCalendarViewType,
  parseSchedulerParams,
  schedulerHref,
  usesPersonColumns,
  type SchedulerParams,
} from '../search-params'

const params = (overrides: Partial<SchedulerParams> = {}): SchedulerParams => ({
  view: 'my',
  mode: 'week',
  date: '2026-10-12',
  profileIds: [],
  studentIds: [],
  types: [],
  roomIds: [],
  status: null,
  ...overrides,
})

describe('usesPersonColumns', () => {
  it('is true for the team view in day and week mode', () => {
    expect(usesPersonColumns(params({ view: 'team', mode: 'day' }))).toBe(true)
    expect(usesPersonColumns(params({ view: 'team', mode: 'week' }))).toBe(true)
  })

  it('is false for the team view in month mode, which stays an overlay', () => {
    expect(usesPersonColumns(params({ view: 'team', mode: 'month' }))).toBe(false)
  })

  it('is false for the my and rooms views in every mode', () => {
    for (const view of ['my', 'rooms'] as const) {
      for (const mode of ['day', 'week', 'month'] as const) {
        expect(usesPersonColumns(params({ view, mode }))).toBe(false)
      }
    }
  })
})

describe('fullCalendarViewType - team view', () => {
  it('team day -> resourceTimeGridDay', () => {
    expect(fullCalendarViewType(params({ view: 'team', mode: 'day' }))).toBe('resourceTimeGridDay')
  })

  it('team week -> resourceTimeGridWeek', () => {
    expect(fullCalendarViewType(params({ view: 'team', mode: 'week' }))).toBe('resourceTimeGridWeek')
  })

  it('team month -> dayGridMonth', () => {
    expect(fullCalendarViewType(params({ view: 'team', mode: 'month' }))).toBe('dayGridMonth')
  })

  it('my view never uses resource grids', () => {
    expect(fullCalendarViewType(params({ view: 'my', mode: 'day' }))).toBe('timeGridDay')
    expect(fullCalendarViewType(params({ view: 'my', mode: 'week' }))).toBe('timeGridWeek')
    expect(fullCalendarViewType(params({ view: 'my', mode: 'month' }))).toBe('dayGridMonth')
  })
})

describe('schedulerHref', () => {
  /** Reads a scheduler href back the way the page does: query string into raw search params. */
  const parseHref = (href: string) => {
    const raw: Record<string, string> = {}
    for (const [key, value] of new URL(href, 'http://localhost').searchParams) raw[key] = value
    return parseSchedulerParams(raw)
  }

  it('starts with /scheduler? and carries the date', () => {
    expect(schedulerHref(params())).toBe('/scheduler?date=2026-10-12')
  })

  it('always starts with /scheduler? for any state', () => {
    expect(schedulerHref(params({ view: 'rooms', mode: 'month', status: 'cancelled' }))).toMatch(/^\/scheduler\?/)
  })

  it('round-trips a default state through parseSchedulerParams', () => {
    expect(parseHref(schedulerHref(params()))).toEqual(params())
  })

  it('round-trips a fully populated team state through parseSchedulerParams', () => {
    const state = params({
      view: 'team',
      mode: 'day',
      date: '2026-10-14',
      profileIds: ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'],
      studentIds: ['33333333-3333-4333-8333-333333333333'],
      types: ['examination', 'consultation'],
      roomIds: ['44444444-4444-4444-8444-444444444444'],
      status: 'cancelled',
    })
    expect(parseHref(schedulerHref(state))).toEqual(state)
  })

  it('round-trips a rooms state with a status filter', () => {
    const state = params({ view: 'rooms', mode: 'week', roomIds: ['44444444-4444-4444-8444-444444444444'], status: 'confirmed' })
    expect(parseHref(schedulerHref(state))).toEqual(state)
  })
})
