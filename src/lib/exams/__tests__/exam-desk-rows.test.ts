import { describe, it, expect } from 'vitest'
import { examCandidates, examDeskActions, splitExamDeskRows, toExamDeskRows } from '../exam-desk-rows'
import { candidate, emma, lucas, makeDeskBooking, officer } from './exam-desk-fixture'

const rowOf = (...args: Parameters<typeof makeDeskBooking>) => toExamDeskRows([makeDeskBooking(...args)])[0]

describe('toExamDeskRows', () => {
  it('shapes a single examination', () => {
    expect(rowOf()).toMatchObject({
      bookingId: 'booking-1',
      localDate: '2026-10-14',
      schoolId: 'school-headington',
      schoolName: 'Headington School',
      entryYear: 2027,
      assessment: 'English, Mathematics',
      roomId: 'room-exam',
      isOnline: false,
      seatLabel: 'Seat 1',
      status: 'confirmed',
      attendance: null,
    })
    expect(rowOf().candidates).toEqual([
      { studentId: 'student-lucas', name: 'Lucas Ng', sortName: 'ng lucas', code: 'S001', seatNo: 1 },
    ])
  })

  it('carries the exam record id, or null when the booking has none', () => {
    expect(rowOf().examId).toBeNull()
    expect(rowOf({ exam_id: 'exam-9' }).examId).toBe('exam-9')
  })

  it('prefers the school set on the booking over the application school', () => {
    const row = rowOf({ school: { id: 'school-charterhouse', name: 'Charterhouse' } })
    expect(row.schoolName).toBe('Charterhouse')
  })

  it('leaves school and entry year empty without a linked application', () => {
    expect(rowOf({ application: null })).toMatchObject({ schoolId: null, schoolName: null, entryYear: null })
  })

  it('reads the assessment only from a non-empty label', () => {
    expect(rowOf({ assessment_snapshot: null }).assessment).toBeNull()
    expect(rowOf({ assessment_snapshot: { label: '   ' } }).assessment).toBeNull()
    expect(rowOf({ assessment_snapshot: ['English'] }).assessment).toBeNull()
  })

  it('marks an online examination and shows no seat', () => {
    const row = rowOf({ location_type: 'online', room: null, attendees: [candidate(lucas)] })
    expect(row).toMatchObject({ isOnline: true, roomId: null, seatLabel: null })
  })

  it('treats only the two known attendance values as recorded', () => {
    expect(rowOf({ attendance: 'show_up' }).attendance).toBe('show_up')
    expect(rowOf({ attendance: 'no_show' }).attendance).toBe('no_show')
    expect(rowOf({ attendance: 'late' }).attendance).toBeNull()
  })

  it('makes names, codes, school, assessment and title searchable', () => {
    const { searchText } = rowOf()
    for (const word of ['lucas ng', 's001', 'headington school', 'english, mathematics', 'entrance exam']) {
      expect(searchText).toContain(word)
    }
  })
})

describe('examCandidates', () => {
  it('lists group candidates by seat and ignores staff', () => {
    const booking = makeDeskBooking({
      booking_type: 'group_examination',
      student: null,
      attendees: [officer(), candidate(lucas, 2), candidate(emma, 1)],
    })
    expect(examCandidates(booking).map(c => c.name)).toEqual(['Emma Chan', 'Lucas Ng'])
    expect(toExamDeskRows([booking])[0].seatLabel).toBe('Seats 1, 2')
  })

  it('puts candidates without a seat last, by surname', () => {
    const booking = makeDeskBooking({ attendees: [candidate(lucas), candidate(emma), candidate({ ...lucas, id: 'x', surname: 'Au' }, 3)] })
    expect(examCandidates(booking).map(c => c.sortName)).toEqual(['au lucas', 'chan emma', 'ng lucas'])
  })

  it('falls back to the booking student when no candidate was recorded', () => {
    expect(examCandidates(makeDeskBooking({ attendees: [] }))).toEqual([
      { studentId: 'student-lucas', name: 'Lucas Ng', sortName: 'ng lucas', code: 'S001', seatNo: null },
    ])
  })

  it('returns nobody when the booking has neither candidates nor a student', () => {
    expect(examCandidates(makeDeskBooking({ attendees: [], student: null }))).toEqual([])
  })
})

describe('splitExamDeskRows', () => {
  it('moves a show-up to the second list and keeps a no-show on the first without counting it', () => {
    const rows = toExamDeskRows([
      makeDeskBooking({ id: 'waiting' }),
      makeDeskBooking({ id: 'present', attendance: 'show_up' }),
      makeDeskBooking({ id: 'absent', attendance: 'no_show' }),
      makeDeskBooking({ id: 'pending', status: 'pending' }),
    ])
    const { booked, showedUp, waiting } = splitExamDeskRows(rows)
    expect(booked.map(r => r.bookingId)).toEqual(['waiting', 'absent', 'pending'])
    expect(showedUp.map(r => r.bookingId)).toEqual(['present'])
    expect(waiting).toBe(2)
  })
})

describe('examDeskActions', () => {
  const none = { confirm: false, showUp: false, noShow: false }

  it('offers nothing to a user who may not write', () => {
    expect(examDeskActions({ status: 'pending', attendance: null }, false)).toEqual(none)
    expect(examDeskActions({ status: 'confirmed', attendance: null }, false)).toEqual(none)
  })
  it('offers only Confirm on a pending booking', () => {
    expect(examDeskActions({ status: 'pending', attendance: null }, true)).toEqual({ ...none, confirm: true })
  })
  it('offers both attendance buttons on a confirmed booking', () => {
    expect(examDeskActions({ status: 'confirmed', attendance: null }, true)).toEqual({ confirm: false, showUp: true, noShow: true })
  })
  it('still offers Showed up after a no-show, for a late arrival', () => {
    expect(examDeskActions({ status: 'confirmed', attendance: 'no_show' }, true)).toEqual({ ...none, showUp: true })
  })
  it('offers nothing once the student showed up', () => {
    expect(examDeskActions({ status: 'confirmed', attendance: 'show_up' }, true)).toEqual(none)
  })
})
