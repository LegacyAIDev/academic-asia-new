import { describe, it, expect } from 'vitest'
import { mapSchedulerError } from '../error-messages'

describe('mapSchedulerError', () => {
  it('returns the fallback when there is no error', () => {
    expect(mapSchedulerError(null)).toBe('Something went wrong. Please try again.')
    expect(mapSchedulerError(undefined)).toBe('Something went wrong. Please try again.')
  })

  it('accepts a custom fallback', () => {
    expect(mapSchedulerError(null, 'Custom fallback')).toBe('Custom fallback')
  })

  it('passes through the DB message for SR002 (room capacity)', () => {
    expect(mapSchedulerError({ code: 'SR002', message: 'Room seats 10, requested 12.' })).toBe('Room seats 10, requested 12.')
  })

  it('falls back to a generic capacity message for SR002 with no DB message', () => {
    expect(mapSchedulerError({ code: 'SR002' })).toBe('Room capacity exceeded.')
  })

  it('maps known SQLSTATE codes to friendly text', () => {
    expect(mapSchedulerError({ code: 'SR001' })).toBe('That room is exclusively booked for this time.')
    expect(mapSchedulerError({ code: 'SR003' })).toBe('The seat number is outside the room capacity.')
    expect(mapSchedulerError({ code: 'SR004' })).toBe('A reason is required.')
    expect(mapSchedulerError({ code: '23P01' })).toBe('That seat is already taken for this time.')
    expect(mapSchedulerError({ code: 'P0002' })).toBe('Booking not found or already cancelled.')
    expect(mapSchedulerError({ code: '23514' })).toBe('Invalid booking times, location or link.')
    expect(mapSchedulerError({ code: '22P02' })).toBe('Invalid booking data.')
    expect(mapSchedulerError({ code: '23505' })).toBe('This name is already in use.')
  })

  it('ignores the DB message for mapped codes other than SR002', () => {
    expect(mapSchedulerError({ code: 'P0002', message: 'raw pg detail' })).toBe('Booking not found or already cancelled.')
  })

  it('falls back to the raw message for an unmapped code', () => {
    expect(mapSchedulerError({ code: '99999', message: 'some unexpected db error' })).toBe('some unexpected db error')
  })

  it('falls back to the default fallback for an unmapped code with no message', () => {
    expect(mapSchedulerError({ code: '99999' })).toBe('Something went wrong. Please try again.')
  })

  it('falls back to the message when there is no code at all', () => {
    expect(mapSchedulerError({ message: 'network blip' })).toBe('network blip')
  })
})
