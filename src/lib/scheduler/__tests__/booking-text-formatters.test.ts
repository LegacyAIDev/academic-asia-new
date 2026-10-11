import { describe, it, expect } from 'vitest'
import { formatBookingText } from '../booking-text-formatters'
import { isExamBooking } from '../config'
import { makeAttendee, makeBookingDetail } from './booking-detail-fixture'

const lines = (text: string) => text.split('\n')

describe('formatBookingText - room booking', () => {
  it('writes the full summary in a fixed order', () => {
    expect(formatBookingText(makeBookingDetail())).toBe(
      [
        'Mock exam',
        'Type: Examination',
        'Status: Confirmed',
        'Date: Wednesday 14/10/2026',
        'Time: 09:00–11:00 (Hong Kong time)',
        'Location: Central Centre',
        'Address: 1 Queens Road Central',
        'Room: Exam Room (14/F R3)',
        'Seats: 4 of 12',
        'Organiser: Olivia Ng',
        'Student: Amy Chan (S001)',
      ].join('\n'),
    )
  })

  it('shows date and time in Hong Kong even when UTC is still on the previous day', () => {
    // 17:00Z on the 14th is 01:00 on Thursday the 15th in Hong Kong.
    const text = formatBookingText(
      makeBookingDetail({ start_at: '2026-10-14T17:00:00.000Z', end_at: '2026-10-14T18:30:00.000Z' }),
    )
    expect(lines(text)).toContain('Date: Thursday 15/10/2026')
    expect(lines(text)).toContain('Time: 01:00–02:30 (Hong Kong time)')
  })

  it('shows the seats as taken of capacity, or the whole room when exclusive', () => {
    expect(lines(formatBookingText(makeBookingDetail({ seats_required: 7 })))).toContain('Seats: 7 of 12')
    expect(lines(formatBookingText(makeBookingDetail({ is_exclusive: true })))).toContain('Seats: whole room')
  })

  it('names the room with floor and number, or just floor, or just the name', () => {
    const room = makeBookingDetail().room!
    const roomLine = (patch: Partial<typeof room>) =>
      lines(formatBookingText(makeBookingDetail({ room: { ...room, ...patch } }))).find(l => l.startsWith('Room:'))

    expect(roomLine({})).toBe('Room: Exam Room (14/F R3)')
    expect(roomLine({ room_number: null })).toBe('Room: Exam Room (14/F)')
    expect(roomLine({ floor: null })).toBe('Room: Exam Room (R3)')
    expect(roomLine({ floor: null, room_number: null })).toBe('Room: Exam Room')
  })

  it('omits the address when the location has none', () => {
    const room = makeBookingDetail().room!
    const text = formatBookingText(makeBookingDetail({ room: { ...room, location: { name: 'Central Centre', address: null } } }))
    expect(text).toContain('Location: Central Centre')
    expect(text).not.toContain('Address:')
  })

  it('omits place and seat lines when no room is set', () => {
    const text = formatBookingText(makeBookingDetail({ room: null, room_id: null }))
    for (const label of ['Location:', 'Address:', 'Room:', 'Seats:']) expect(text).not.toContain(label)
  })

  it('capitalises the status', () => {
    expect(lines(formatBookingText(makeBookingDetail({ status: 'cancelled' })))).toContain('Status: Cancelled')
    expect(lines(formatBookingText(makeBookingDetail({ status: 'pending' })))).toContain('Status: Pending')
  })

  it('uses the readable type label, and the raw value for an unknown type', () => {
    expect(lines(formatBookingText(makeBookingDetail({ booking_type: 'group_examination' })))).toContain('Type: Group examination')
    expect(lines(formatBookingText(makeBookingDetail({ booking_type: 'made_up' })))).toContain('Type: made_up')
  })
})

describe('formatBookingText - online booking', () => {
  const online = (patch = {}) =>
    makeBookingDetail({ location_type: 'online', online_link: 'https://meet.example/abc', ...patch })

  it('shows the link and no room, address or seats', () => {
    const text = formatBookingText(online())
    expect(lines(text)).toContain('Online: https://meet.example/abc')
    for (const label of ['Room:', 'Address:', 'Location:', 'Seats:']) expect(text).not.toContain(label)
  })

  it('says the link follows when none is set yet', () => {
    expect(formatBookingText(online({ online_link: null }))).toContain('Online: link to follow')
  })
})

describe('formatBookingText - people and free text', () => {
  it('lists attendees with role and seat', () => {
    const text = formatBookingText(
      makeBookingDetail({
        attendees: [
          makeAttendee({
            id: 'a1',
            profile_id: 'profile-ben',
            role: 'staff',
            profile: { id: 'profile-ben', first_name: 'Ben', surname: 'Lee' },
          }),
          makeAttendee({
            id: 'a2',
            student_id: 'student-amy',
            role: 'candidate',
            seat_no: 3,
            student: { id: 'student-amy', first_name: 'Amy', surname: 'Chan', student_code: 'S001' },
          }),
        ],
      }),
    )
    expect(lines(text)).toContain('Attendees: Ben Lee (staff); Amy Chan (candidate, seat 3)')
  })

  it('leaves the attendees line out when there are none', () => {
    expect(formatBookingText(makeBookingDetail())).not.toContain('Attendees:')
  })

  it('omits organiser and student lines when absent, and the code when the student has none', () => {
    const noPeople = formatBookingText(makeBookingDetail({ organiser: null, student: null }))
    expect(noPeople).not.toContain('Organiser:')
    expect(noPeople).not.toContain('Student:')

    const noCode = formatBookingText(
      makeBookingDetail({ student: { id: 'student-amy', first_name: 'Amy', surname: 'Chan', student_code: null } }),
    )
    expect(lines(noCode)).toContain('Student: Amy Chan')
  })

  it('adds notes and instructions only when set', () => {
    const bare = formatBookingText(makeBookingDetail())
    expect(bare).not.toContain('Notes:')
    expect(bare).not.toContain('Instructions:')

    const empty = formatBookingText(makeBookingDetail({ notes: '', instructions: '' }))
    expect(empty).not.toContain('Notes:')
    expect(empty).not.toContain('Instructions:')

    const full = lines(formatBookingText(makeBookingDetail({ notes: 'Bring a pencil', instructions: 'Arrive 15 minutes early' })))
    expect(full.slice(-2)).toEqual(['Notes: Bring a pencil', 'Instructions: Arrive 15 minutes early'])
  })

  it('never leaves blank lines between sections', () => {
    const text = formatBookingText(makeBookingDetail({ room: null, organiser: null, student: null }))
    expect(lines(text).every(line => line.trim() !== '')).toBe(true)
  })
})

describe('isExamBooking', () => {
  it.each(['examination', 'group_examination'])('is true for %s', type => {
    expect(isExamBooking(type)).toBe(true)
  })

  it.each(['consultation', 'school_interview', 'internal_meeting', 'room_reservation', 'other', '', 'Examination'])(
    'is false for %j',
    type => {
      expect(isExamBooking(type)).toBe(false)
    },
  )
})
