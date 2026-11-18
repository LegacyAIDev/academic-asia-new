import { describe, expect, it } from 'vitest'
import { defaultBookingTitle } from '../booking-title'

describe('a booking left without a title', () => {
  it('is named from its type, then who and where', () => {
    expect(defaultBookingTitle('Examination', ['Lucas Ng', 'Headington School'])).toBe('Examination · Lucas Ng · Headington School')
    expect(defaultBookingTitle('Room reservation', [null, '', ' Exam Room '])).toBe('Room reservation · Exam Room')
    expect(defaultBookingTitle('Internal meeting', [])).toBe('Internal meeting')
  })
})
