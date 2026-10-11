import { describe, it, expect } from 'vitest'
import {
  daysBetween, examListHref, examsHref, isDeskDate, nextSort, parseExamDeskParams, parseExamListParams, resolveExamView,
} from '../exam-page-search-params'

const ROOM = '11111111-1111-4111-8111-111111111111'
const SCHOOL = '22222222-2222-4222-8222-222222222222'
const now = new Date('2026-03-15T03:00:00.000Z') // 11:00 HKT

describe('isDeskDate', () => {
  it('accepts a real date', () => {
    expect(isDeskDate('2026-02-28')).toBe(true)
  })
  it('rejects malformed, impossible and half-typed dates', () => {
    expect(isDeskDate('28/02/2026')).toBe(false)
    expect(isDeskDate('2026-02-31')).toBe(false)
    expect(isDeskDate('0002-03-15')).toBe(false)
    expect(isDeskDate('')).toBe(false)
    expect(isDeskDate(undefined)).toBe(false)
  })
})

describe('daysBetween', () => {
  it('counts whole days, across a month end and a leap day', () => {
    expect(daysBetween('2026-10-14', '2026-10-14')).toBe(0)
    expect(daysBetween('2026-01-31', '2026-02-01')).toBe(1)
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2)
  })
  it('is negative when the second date is earlier', () => {
    expect(daysBetween('2026-10-14', '2026-10-10')).toBe(-4)
  })
})

describe('resolveExamView', () => {
  it('opens the desk by default and for an unknown view', () => {
    expect(resolveExamView({})).toBe('desk')
    expect(resolveExamView({ view: 'bogus' })).toBe('desk')
  })
  it('opens the list when asked for', () => {
    expect(resolveExamView({ view: 'all' })).toBe('all')
  })
  it('keeps links from before the desk existed on the list', () => {
    expect(resolveExamView({ status: '2' })).toBe('all')
    expect(resolveExamView({ page: '3' })).toBe('all')
  })
  it('lets an explicit desk view win over old list parameters', () => {
    expect(resolveExamView({ view: 'desk', status: '2' })).toBe('desk')
  })
})

describe('parseExamDeskParams', () => {
  it('defaults to today in Hong Kong with no filters, sorted by time', () => {
    expect(parseExamDeskParams({}, now)).toEqual({
      from: '2026-03-15', to: '2026-03-15', rangeClamped: false,
      roomId: null, schoolId: null, entryYear: null, q: '', sort: 'time', dir: 'asc',
    })
  })
  it('uses the Hong Kong date when it is already tomorrow there', () => {
    const lateEvening = new Date('2026-03-14T17:30:00.000Z') // 01:30 HKT on the 15th
    expect(parseExamDeskParams({}, lateEvening).from).toBe('2026-03-15')
  })
  it('falls back to today for an invalid from date', () => {
    expect(parseExamDeskParams({ from: '2026-02-31' }, now).from).toBe('2026-03-15')
  })
  it('shows a single day when only from is given', () => {
    const parsed = parseExamDeskParams({ from: '2026-04-01' }, now)
    expect([parsed.from, parsed.to]).toEqual(['2026-04-01', '2026-04-01'])
  })
  it('ignores a to date before from', () => {
    expect(parseExamDeskParams({ from: '2026-04-10', to: '2026-04-01' }, now).to).toBe('2026-04-10')
  })
  it('keeps a range of exactly 62 days', () => {
    const parsed = parseExamDeskParams({ from: '2026-01-01', to: '2026-03-04' }, now)
    expect(parsed.to).toBe('2026-03-04')
    expect(parsed.rangeClamped).toBe(false)
  })
  it('shortens a longer range to 62 days and says so', () => {
    const parsed = parseExamDeskParams({ from: '2026-01-01', to: '2026-12-31' }, now)
    expect(parsed.to).toBe('2026-03-04')
    expect(parsed.rangeClamped).toBe(true)
  })
  it('keeps valid ids, year and search text', () => {
    const parsed = parseExamDeskParams({ room: ROOM, school: SCHOOL, year: '2027', q: '  lucas ng  ' }, now)
    expect(parsed).toMatchObject({ roomId: ROOM, schoolId: SCHOOL, entryYear: 2027, q: 'lucas ng' })
  })
  it('drops ids that are not uuids and years that are not plausible', () => {
    const parsed = parseExamDeskParams({ room: 'abc', school: "1' or 1=1", year: '1999' }, now)
    expect(parsed).toMatchObject({ roomId: null, schoolId: null, entryYear: null })
    expect(parseExamDeskParams({ year: 'abc' }, now).entryYear).toBeNull()
  })
  it('cuts a very long search to 100 characters', () => {
    expect(parseExamDeskParams({ q: 'x'.repeat(300) }, now).q).toHaveLength(100)
  })
  it('falls back to time ascending for an unknown sort', () => {
    expect(parseExamDeskParams({ sort: 'bogus', dir: 'up' }, now)).toMatchObject({ sort: 'time', dir: 'asc' })
  })
  it('reads the first value when a parameter is repeated', () => {
    expect(parseExamDeskParams({ sort: ['school', 'room'], dir: 'desc' }, now)).toMatchObject({ sort: 'school', dir: 'desc' })
  })
})

describe('parseExamListParams', () => {
  it('defaults to every status, page one and no date range', () => {
    expect(parseExamListParams({})).toEqual({ statusId: undefined, page: 1, from: null, to: null })
  })
  it('reads status, page and dates', () => {
    expect(parseExamListParams({ status: '3', page: '4', from: '2026-01-01', to: '2026-12-31' }))
      .toEqual({ statusId: 3, page: 4, from: '2026-01-01', to: '2026-12-31' })
  })
  it('ignores values that make no sense', () => {
    expect(parseExamListParams({ status: '9', page: '0', from: 'soon', to: '2026-13-01' }))
      .toEqual({ statusId: undefined, page: 1, from: null, to: null })
  })
  it('falls back to page one for an absurd page number', () => {
    expect(parseExamListParams({ page: '99999999999' }).page).toBe(1)
    expect(parseExamListParams({ page: '100000' }).page).toBe(100000)
  })
})

describe('examsHref', () => {
  it('returns the bare path when nothing is set', () => {
    expect(examsHref({})).toBe('/exams')
  })
  it('keeps known parameters and drops unknown ones', () => {
    expect(examsHref({ from: '2026-04-01', q: 'ng', utm_source: 'mail' })).toBe('/exams?from=2026-04-01&q=ng')
  })
  it('applies a patch and removes a parameter patched to null', () => {
    expect(examsHref({ from: '2026-04-01', room: ROOM }, { room: null, sort: 'school', dir: 'desc' }))
      .toBe('/exams?from=2026-04-01&sort=school&dir=desc')
  })
})

describe('examListHref', () => {
  it('always points at the list', () => {
    expect(examListHref({})).toBe('/exams?view=all')
  })
  it('leaves out page one and empty dates', () => {
    expect(examListHref({ status: 2, page: 1, from: null, to: '2026-04-30' })).toBe('/exams?view=all&to=2026-04-30&status=2')
  })
  it('carries the page from page two onwards', () => {
    expect(examListHref({ page: 2 })).toBe('/exams?view=all&page=2')
  })
})

describe('nextSort', () => {
  it('flips the direction of the active column', () => {
    expect(nextSort({ sort: 'time', dir: 'asc' }, 'time')).toEqual({ sort: 'time', dir: 'desc' })
    expect(nextSort({ sort: 'time', dir: 'desc' }, 'time')).toEqual({ sort: 'time', dir: 'asc' })
  })
  it('starts ascending on another column', () => {
    expect(nextSort({ sort: 'time', dir: 'desc' }, 'school')).toEqual({ sort: 'school', dir: 'asc' })
  })
})
