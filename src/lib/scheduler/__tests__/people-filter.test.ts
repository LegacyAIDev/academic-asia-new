import { describe, it, expect } from 'vitest'
import { peopleOrFilter } from '../people-filter'

const STUDENT_A = '11111111-1111-4111-8111-111111111111'
const STUDENT_B = '22222222-2222-4222-8222-222222222222'
const BOOKING_X = '33333333-3333-4333-8333-333333333333'
const BOOKING_Y = '44444444-4444-4444-8444-444444444444'

describe('peopleOrFilter', () => {
  it('matches the booking student or the booking id when both lists are given', () => {
    expect(peopleOrFilter([STUDENT_A, STUDENT_B], [BOOKING_X], 'booking_id')).toBe(
      `student_id.in.(${STUDENT_A},${STUDENT_B}),booking_id.in.(${BOOKING_X})`,
    )
  })

  it('uses the id column the caller names', () => {
    expect(peopleOrFilter([STUDENT_A], [BOOKING_X, BOOKING_Y], 'id')).toBe(
      `student_id.in.(${STUDENT_A}),id.in.(${BOOKING_X},${BOOKING_Y})`,
    )
  })

  it('filters on students alone', () => {
    expect(peopleOrFilter([STUDENT_A], [], 'id')).toBe(`student_id.in.(${STUDENT_A})`)
    expect(peopleOrFilter([STUDENT_A, STUDENT_B], [], 'booking_id')).toBe(`student_id.in.(${STUDENT_A},${STUDENT_B})`)
  })

  it('filters on booking ids alone, for either column', () => {
    expect(peopleOrFilter([], [BOOKING_X], 'id')).toBe(`id.in.(${BOOKING_X})`)
    expect(peopleOrFilter([], [BOOKING_X, BOOKING_Y], 'booking_id')).toBe(`booking_id.in.(${BOOKING_X},${BOOKING_Y})`)
  })

  it('returns null when nothing can match, so the query can be skipped', () => {
    expect(peopleOrFilter([], [], 'id')).toBeNull()
    expect(peopleOrFilter([], [], 'booking_id')).toBeNull()
  })

  it('joins clauses with a comma and no spaces, as PostgREST expects', () => {
    const filter = peopleOrFilter([STUDENT_A], [BOOKING_X], 'id')
    expect(filter).not.toMatch(/\s/)
    expect(filter?.split('),')).toHaveLength(2)
  })
})
