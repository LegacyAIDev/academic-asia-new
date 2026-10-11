import { describe, it, expect } from 'vitest'
import { bookingPageHref, safeReturnPath } from '../return-path'
import { schedulerHref } from '../search-params'

const FALLBACK = '/scheduler?date=2026-10-09'
const ROOM_ID = '44444444-4444-4444-8444-444444444444'

describe('safeReturnPath - accepted paths', () => {
  it.each([
    ['the scheduler root', '/scheduler'],
    ['a full filtered calendar url', `/scheduler?view=rooms&mode=week&date=2026-10-12&rooms=${ROOM_ID}&status=cancelled`],
    ['a nested scheduler page', '/scheduler/bookings/x'],
    ['a url with only a fragment', '/scheduler#today'],
    ['an encoded people list', '/scheduler?view=team&people=p%3A11111111-1111-4111-8111-111111111111'],
  ])('accepts %s', (_label, path) => {
    expect(safeReturnPath(path, FALLBACK)).toBe(path)
  })

  it('accepts the url the calendar itself builds', () => {
    const href = schedulerHref({
      view: 'team',
      mode: 'week',
      date: '2026-10-12',
      profileIds: ['11111111-1111-4111-8111-111111111111'],
      studentIds: ['22222222-2222-4222-8222-222222222222'],
      types: ['examination', 'consultation'],
      roomIds: [ROOM_ID],
      status: 'cancelled',
    })
    expect(safeReturnPath(href, FALLBACK)).toBe(href)
  })
})

describe('safeReturnPath - rejected paths', () => {
  it.each([
    ['undefined', undefined],
    ['an empty string', ''],
    ['another section', '/students'],
    ['a path that only starts with the word scheduler', '/schedulerx'],
    ['a path that only starts with the word scheduler plus a query', '/schedulerx?a=1'],
    ['an absolute url', 'https://evil.com/scheduler'],
    ['a protocol-relative url', '//evil.com'],
    ['a protocol-relative url inside the path', '/scheduler//evil.com'],
    ['a backslash right after the section', '/scheduler\\evil'],
    ['a backslash further in', '/scheduler/\\evil.com'],
    ['a url smuggled in a query value', '/scheduler?next=https://x'],
    ['a relative path', 'scheduler'],
    ['a path without the leading slash', 'scheduler/bookings/x'],
    ['a javascript url', 'javascript:alert(1)'],
    ['the site root', '/'],
  ])('falls back for %s', (_label, path) => {
    expect(safeReturnPath(path, FALLBACK)).toBe(FALLBACK)
  })

  it('returns exactly the fallback it was given', () => {
    expect(safeReturnPath('/students', '/scheduler')).toBe('/scheduler')
  })
})

describe('safeReturnPath - array input', () => {
  it('takes the first element', () => {
    expect(safeReturnPath(['/scheduler?date=2026-10-12', '/students'], FALLBACK)).toBe('/scheduler?date=2026-10-12')
  })

  it('judges only the first element, even when a later one is valid', () => {
    expect(safeReturnPath(['/students', '/scheduler'], FALLBACK)).toBe(FALLBACK)
  })

  it('falls back for an empty array', () => {
    expect(safeReturnPath([], FALLBACK)).toBe(FALLBACK)
  })
})

describe('bookingPageHref', () => {
  it('links to the booking page alone without a return path', () => {
    expect(bookingPageHref('abc')).toBe('/scheduler/bookings/abc')
  })

  it('ignores an empty return path', () => {
    expect(bookingPageHref('abc', '')).toBe('/scheduler/bookings/abc')
  })

  it('appends the encoded return path as the from parameter', () => {
    const returnTo = `/scheduler?view=rooms&mode=day&date=2026-10-12&rooms=${ROOM_ID}`
    const href = bookingPageHref('abc', returnTo)
    expect(href).toBe(`/scheduler/bookings/abc?from=${encodeURIComponent(returnTo)}`)
    // The return path's own & and = must not leak into the booking page query string.
    expect(href.split('?')).toHaveLength(2)
    expect(href.split('?')[1].split('&')).toHaveLength(1)
  })

  it('round-trips through decodeURIComponent and the url parser', () => {
    const returnTo = '/scheduler?view=team&people=p%3A1,s%3A2&date=2026-10-12&status=cancelled'
    const href = bookingPageHref('abc', returnTo)
    const encoded = href.slice(href.indexOf('from=') + 'from='.length)
    expect(decodeURIComponent(encoded)).toBe(returnTo)
    expect(new URL(href, 'http://localhost').searchParams.get('from')).toBe(returnTo)
  })

  it('produces a value that safeReturnPath accepts again', () => {
    const returnTo = `/scheduler?view=rooms&mode=week&date=2026-10-12&rooms=${ROOM_ID}&status=cancelled`
    const from = new URL(bookingPageHref('abc', returnTo), 'http://localhost').searchParams.get('from') ?? undefined
    expect(safeReturnPath(from, FALLBACK)).toBe(returnTo)
  })
})
