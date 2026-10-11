import { describe, it, expect } from 'vitest'
import { formatFamilyExamText } from '../booking-text-formatters'
import { makeAttendee, makeBookingDetail } from './booking-detail-fixture'

const lines = (text: string) => text.split('\n')

const amy = { id: 'student-amy', first_name: 'Amy', surname: 'Chan', student_code: 'S001' }
const ben = { id: 'student-ben', first_name: 'Ben', surname: 'Wong', student_code: 'S002' }

/** Two candidates in one sitting; the booking's own student is Amy. */
const twoCandidates = [
  makeAttendee({ id: 'a1', student_id: 'student-ben', role: 'candidate', seat_no: 8, student: ben }),
  makeAttendee({ id: 'a2', student_id: 'student-amy', role: 'candidate', seat_no: 7, student: amy }),
]

describe('formatFamilyExamText', () => {
  it('writes the family-ready text with student, school, assessment, time, place and seat', () => {
    const text = formatFamilyExamText(
      makeBookingDetail({
        assessment_snapshot: { label: 'IGCSE Mathematics Paper 2', version: null },
        attendees: twoCandidates,
        instructions: 'Arrive 15 minutes early',
      }),
    )
    expect(text).toBe(
      [
        'Examination details',
        'Student: Amy Chan',
        'School: Victoria Primary',
        'Assessment: IGCSE Mathematics Paper 2',
        'Date: Wednesday 14/10/2026',
        'Time: 09:00–11:00 (Hong Kong time)',
        'Location: Central Centre',
        'Address: 1 Queens Road Central',
        'Room: Exam Room (14/F R3)',
        'Seat: 7',
        'Instructions: Arrive 15 minutes early',
      ].join('\n'),
    )
  })

  it('starts with the examination details header', () => {
    expect(lines(formatFamilyExamText(makeBookingDetail()))[0]).toBe('Examination details')
  })

  it('shows the student without their code', () => {
    const text = formatFamilyExamText(makeBookingDetail())
    expect(lines(text)).toContain('Student: Amy Chan')
    expect(text).not.toContain('S001')
  })

  it('leaves out colleague-facing lines', () => {
    const text = formatFamilyExamText(
      makeBookingDetail({
        notes: 'Internal: parent is late payer',
        attendees: twoCandidates,
      }),
    )
    for (const label of ['Organiser:', 'Attendees:', 'Notes:', 'Type:', 'Status:', 'Seats:']) {
      expect(text).not.toContain(label)
    }
    expect(text).not.toContain('Olivia')
    expect(text).not.toContain('Ben Wong')
    expect(text).not.toContain('late payer')
  })

  it('picks the seat of the candidate who is the booking student', () => {
    const attendees = [...twoCandidates].reverse()
    expect(lines(formatFamilyExamText(makeBookingDetail({ attendees })))).toContain('Seat: 7')
    expect(lines(formatFamilyExamText(makeBookingDetail({ student_id: 'student-ben', attendees })))).toContain('Seat: 8')
  })

  it('omits the seat when the student is not seated or has no seat number', () => {
    expect(formatFamilyExamText(makeBookingDetail())).not.toContain('Seat:')

    const unseated = [makeAttendee({ student_id: 'student-amy', role: 'candidate', seat_no: null, student: amy })]
    expect(formatFamilyExamText(makeBookingDetail({ attendees: unseated }))).not.toContain('Seat:')

    const onlyOther = [makeAttendee({ student_id: 'student-ben', role: 'candidate', seat_no: 8, student: ben })]
    expect(formatFamilyExamText(makeBookingDetail({ attendees: onlyOther }))).not.toContain('Seat:')
  })

  it('ignores staff attendees when looking for the seat', () => {
    const staff = [makeAttendee({ profile_id: 'profile-ben', role: 'staff', seat_no: 2, profile: { id: 'profile-ben', first_name: 'Ben', surname: 'Lee' } })]
    expect(formatFamilyExamText(makeBookingDetail({ attendees: staff }))).not.toContain('Seat:')
  })

  describe('assessment', () => {
    it('uses the label from the snapshot', () => {
      const text = formatFamilyExamText(makeBookingDetail({ assessment_snapshot: { label: 'ISEE Upper', notes: 'x' } }))
      expect(lines(text)).toContain('Assessment: ISEE Upper')
    })

    it.each([
      ['null', null],
      ['an array', ['label']],
      ['an object without a label', { version: '1' }],
      ['a non-string label', { label: 5 }],
      ['an empty label', { label: '' }],
    ])('is left out for %s', (_name, snapshot) => {
      expect(formatFamilyExamText(makeBookingDetail({ assessment_snapshot: snapshot }))).not.toContain('Assessment:')
    })
  })

  it('leaves out school and student lines when unknown', () => {
    const text = formatFamilyExamText(makeBookingDetail({ school: null, student: null }))
    expect(text).not.toContain('School:')
    expect(text).not.toContain('Student:')
    expect(formatFamilyExamText(makeBookingDetail({ school: { id: 'school-1', name: null } }))).not.toContain('School:')
  })

  it('leaves out instructions when not set', () => {
    expect(formatFamilyExamText(makeBookingDetail())).not.toContain('Instructions:')
  })

  it('gives the online link instead of a room for an online sitting', () => {
    const text = formatFamilyExamText(makeBookingDetail({ location_type: 'online', online_link: 'https://meet.example/abc' }))
    expect(lines(text)).toContain('Online: https://meet.example/abc')
    for (const label of ['Room:', 'Address:', 'Location:']) expect(text).not.toContain(label)
  })
})
