import { describe, it, expect } from 'vitest'
import { canCancelBooking } from '../booking-permissions'

describe('canCancelBooking', () => {
  it.each([
    ['no write access', false, false, 'pending', 'consultation', false],
    ['no write access even with confirm rights', false, true, 'pending', 'examination', false],
    ['already cancelled', true, true, 'cancelled', 'consultation', false],
    ['pending examination, writer without exam access', true, false, 'pending', 'examination', true],
    ['pending group examination, writer without exam access', true, false, 'pending', 'group_examination', true],
    ['confirmed examination, no exam access', true, false, 'confirmed', 'examination', false],
    ['confirmed group examination, no exam access', true, false, 'confirmed', 'group_examination', false],
    ['confirmed examination, with exam access', true, true, 'confirmed', 'examination', true],
    ['confirmed group examination, with exam access', true, true, 'confirmed', 'group_examination', true],
    ['confirmed internal meeting, plain writer', true, false, 'confirmed', 'internal_meeting', true],
    ['confirmed consultation, plain writer', true, false, 'confirmed', 'consultation', true],
  ])('%s', (_label, canWrite, canConfirm, status, bookingType, expected) => {
    expect(canCancelBooking({ canWrite, canConfirm, status, bookingType })).toBe(expected)
  })
})
