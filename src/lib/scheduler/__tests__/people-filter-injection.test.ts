import { describe, it, expect } from 'vitest'
import { peopleOrFilter } from '../people-filter'

const STUDENT = '11111111-1111-4111-8111-111111111111'
const BOOKING = '33333333-3333-4333-8333-333333333333'

describe('peopleOrFilter - non-uuid ids', () => {
  it('drops non-uuid student ids', () => {
    expect(peopleOrFilter([STUDENT, 'not-a-uuid'], [], 'id')).toBe(`student_id.in.(${STUDENT})`)
  })

  it('drops non-uuid booking ids', () => {
    expect(peopleOrFilter([], ['nope', BOOKING], 'booking_id')).toBe(`booking_id.in.(${BOOKING})`)
  })

  it('returns null when every id is invalid', () => {
    expect(peopleOrFilter(['x'], ['y', ''], 'id')).toBeNull()
  })

  it('drops an id that tries to inject another clause', () => {
    const injected = `${BOOKING}),id.not.is.null`
    expect(peopleOrFilter([], [injected], 'id')).toBeNull()
    const filter = peopleOrFilter([STUDENT], [injected, BOOKING], 'id')
    expect(filter).toBe(`student_id.in.(${STUDENT}),id.in.(${BOOKING})`)
    expect(filter).not.toContain('not.is.null')
  })
})
