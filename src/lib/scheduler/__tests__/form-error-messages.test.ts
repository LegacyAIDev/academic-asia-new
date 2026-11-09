import { describe, expect, it } from 'vitest'
import { formErrorMessages } from '../form-error-messages'

describe('formErrorMessages', () => {
  it('lists top-level and nested messages once each', () => {
    const errors = {
      location_type: { type: 'custom', message: 'Group examinations take place in a room' },
      attendees: [undefined, { seat_no: { type: 'too_small', message: 'Seat must be at least 1' } }],
      online_link: { type: 'custom', message: 'Add the meeting link' },
      room_id: { type: 'custom', message: 'Add the meeting link' },
    }
    expect(formErrorMessages(errors as never)).toEqual([
      'Group examinations take place in a room',
      'Seat must be at least 1',
      'Add the meeting link',
    ])
  })

  it('ignores the DOM ref react-hook-form attaches', () => {
    const errors = { title: { type: 'too_small', message: 'Title is required', ref: { name: 'title', nested: { message: 'not a field error' } } } }
    expect(formErrorMessages(errors as never)).toEqual(['Title is required'])
  })

  it('is empty when there are no errors', () => {
    expect(formErrorMessages({})).toEqual([])
  })
})
