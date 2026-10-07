import { describe, it, expect } from 'vitest'
import { overlaps, findConflicts, type BusyInterval } from '../conflicts'

describe('overlaps', () => {
  it('is true when intervals genuinely intersect', () => {
    expect(overlaps('2026-03-15T01:00:00Z', '2026-03-15T02:00:00Z', '2026-03-15T01:30:00Z', '2026-03-15T02:30:00Z')).toBe(true)
  })

  it('is true when one interval fully contains the other', () => {
    expect(overlaps('2026-03-15T01:00:00Z', '2026-03-15T03:00:00Z', '2026-03-15T01:30:00Z', '2026-03-15T02:00:00Z')).toBe(true)
  })

  it('is false for touching intervals (half-open semantics)', () => {
    expect(overlaps('2026-03-15T01:00:00Z', '2026-03-15T02:00:00Z', '2026-03-15T02:00:00Z', '2026-03-15T03:00:00Z')).toBe(false)
  })

  it('is false when intervals do not touch at all', () => {
    expect(overlaps('2026-03-15T01:00:00Z', '2026-03-15T02:00:00Z', '2026-03-15T03:00:00Z', '2026-03-15T04:00:00Z')).toBe(false)
  })
})

describe('findConflicts', () => {
  const candidate = { startAt: '2026-03-15T01:00:00Z', endAt: '2026-03-15T02:00:00Z' }

  function interval(overrides: Partial<BusyInterval>): BusyInterval {
    return {
      subjectKind: 'profile',
      subjectId: 'p1',
      itemSource: 'booking',
      itemId: 'b1',
      title: 'Meeting',
      bookingType: 'internal_meeting',
      startAt: '2026-03-15T01:15:00Z',
      endAt: '2026-03-15T01:45:00Z',
      ...overrides,
    }
  }

  it('splits people and rooms into separate lists', () => {
    const busy = [
      interval({ subjectKind: 'profile', subjectId: 'p1', itemId: 'b1' }),
      interval({ subjectKind: 'room', subjectId: 'r1', itemId: 'b2' }),
      interval({ subjectKind: 'student', subjectId: 's1', itemId: 'b3' }),
    ]
    const result = findConflicts(candidate, busy)
    expect(result.rooms).toHaveLength(1)
    expect(result.rooms[0].subjectId).toBe('r1')
    expect(result.people).toHaveLength(2)
    expect(result.people.map(p => p.subjectId).sort()).toEqual(['p1', 's1'])
  })

  it('excludes intervals that do not overlap the candidate', () => {
    const busy = [interval({ startAt: '2026-03-15T05:00:00Z', endAt: '2026-03-15T06:00:00Z' })]
    const result = findConflicts(candidate, busy)
    expect(result.people).toHaveLength(0)
    expect(result.rooms).toHaveLength(0)
  })

  it('dedupes by subject+item, keeping only the first occurrence', () => {
    const busy = [
      interval({ subjectKind: 'profile', subjectId: 'p1', itemId: 'b1', title: 'First' }),
      interval({ subjectKind: 'profile', subjectId: 'p1', itemId: 'b1', title: 'Duplicate' }),
    ]
    const result = findConflicts(candidate, busy)
    expect(result.people).toHaveLength(1)
    expect(result.people[0].title).toBe('First')
  })

  it('does not dedupe the same subject across different items', () => {
    const busy = [
      interval({ subjectKind: 'profile', subjectId: 'p1', itemId: 'b1' }),
      interval({ subjectKind: 'profile', subjectId: 'p1', itemId: 'b2' }),
    ]
    const result = findConflicts(candidate, busy)
    expect(result.people).toHaveLength(2)
  })

  it('does not dedupe the same item across different subject kinds', () => {
    const busy = [
      interval({ subjectKind: 'profile', subjectId: 'x1', itemId: 'shared' }),
      interval({ subjectKind: 'room', subjectId: 'x1', itemId: 'shared' }),
    ]
    const result = findConflicts(candidate, busy)
    expect(result.people).toHaveLength(1)
    expect(result.rooms).toHaveLength(1)
  })
})
