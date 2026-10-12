import { describe, it, expect } from 'vitest'
import { coverSlipHtml } from '../cover-slip-html'
import { escapeHtml } from '@/lib/pdf/escape-html'
import { buildCoverSlips, coverSlipFilename, isCoverSlipBooking } from '../cover-slip-shaping'
import { makeAttendee, makeBookingDetail } from '@/lib/scheduler/__tests__/booking-detail-fixture'

const amy = { id: 'student-amy', first_name: 'Amy', surname: 'Chan', student_code: 'S001' }
const ben = { id: 'student-ben', first_name: 'Ben', surname: 'Au', student_code: 'S002' }
const candidate = (student: typeof amy, seatNo: number | null) =>
  makeAttendee({ id: `a-${student.id}`, student_id: student.id, role: 'candidate', seat_no: seatNo, student })
const staff = (id: string, firstName: string, role: string) =>
  makeAttendee({ id: `a-${id}`, profile_id: id, role, profile: { id, first_name: firstName, surname: 'Lee' } })

const PAPERS = {
  label: 'English and Mathematics',
  papers: [
    { id: '11111111-1111-4111-8111-111111111111', subject: 'English', duration_minutes: 45 },
    { id: '22222222-2222-4222-8222-222222222222', subject: 'Mathematics', duration_minutes: null },
  ],
}

describe('isCoverSlipBooking', () => {
  it('is true for examinations that are pending or confirmed', () => {
    expect(isCoverSlipBooking({ booking_type: 'examination', status: 'confirmed' })).toBe(true)
    expect(isCoverSlipBooking({ booking_type: 'group_examination', status: 'pending' })).toBe(true)
  })
  it('is false for other bookings and for a cancelled examination', () => {
    expect(isCoverSlipBooking({ booking_type: 'consultation', status: 'confirmed' })).toBe(false)
    expect(isCoverSlipBooking({ booking_type: 'examination', status: 'cancelled' })).toBe(false)
  })
})

describe('buildCoverSlips', () => {
  it('makes one slip for a single examination with the seat of its candidate', () => {
    const slips = buildCoverSlips(makeBookingDetail({ attendees: [candidate(amy, 3)], assessment_snapshot: PAPERS }))
    expect(slips).toEqual([{
      studentName: 'Amy Chan',
      studentCode: 'S001',
      school: 'Victoria Primary',
      date: 'Wednesday 14 October 2026',
      time: '09:00 – 11:00 HKT',
      room: 'Exam Room · 14/F R3',
      seat: '3',
      invigilators: ['Olivia Ng'],
      assessment: 'English and Mathematics',
      papers: [{ subject: 'English', duration: '45 min' }, { subject: 'Mathematics', duration: null }],
    }])
  })

  it('makes one slip per candidate of a group examination, in seat order', () => {
    const booking = makeBookingDetail({
      booking_type: 'group_examination', student_id: null, student: null,
      attendees: [candidate(amy, 2), candidate(ben, 1), staff('p1', 'Sam', 'staff')],
    })
    expect(buildCoverSlips(booking).map(slip => [slip.studentName, slip.seat])).toEqual([['Ben Au', '1'], ['Amy Chan', '2']])
  })

  it('names the officers as invigilators and ignores the organiser and other staff', () => {
    const booking = makeBookingDetail({ attendees: [candidate(amy, 1), staff('p1', 'Sam', 'officer'), staff('p2', 'Kim', 'consultant')] })
    expect(buildCoverSlips(booking)[0].invigilators).toEqual(['Sam Lee'])
  })

  it('falls back to the organiser, and leaves the invigilator open when there is none', () => {
    expect(buildCoverSlips(makeBookingDetail())[0].invigilators).toEqual(['Olivia Ng'])
    expect(buildCoverSlips(makeBookingDetail({ organiser: null }))[0].invigilators).toEqual([])
  })

  it('leaves seat, school, assessment and papers empty when they are not known', () => {
    const slip = buildCoverSlips(makeBookingDetail({ school: null }))[0]
    expect(slip).toMatchObject({ seat: null, school: null, assessment: null, papers: [] })
  })

  it('says Online for an online examination and gives no room when none is set', () => {
    expect(buildCoverSlips(makeBookingDetail({ location_type: 'online', room: null }))[0].room).toBe('Online')
    expect(buildCoverSlips(makeBookingDetail({ room: null }))[0].room).toBeNull()
  })

  it('gives the date and time in Hong Kong even when that is another day in UTC', () => {
    const slip = buildCoverSlips(makeBookingDetail({ start_at: '2026-10-14T16:30:00.000Z', end_at: '2026-10-14T18:00:00.000Z' }))[0]
    expect(slip).toMatchObject({ date: 'Thursday 15 October 2026', time: '00:30 – 02:00 HKT' })
  })

  it('makes no slip for a booking without any candidate', () => {
    expect(buildCoverSlips(makeBookingDetail({ student: null, student_id: null }))).toEqual([])
  })
})

describe('coverSlipFilename', () => {
  it('uses the exam date and the student code', () => {
    expect(coverSlipFilename(makeBookingDetail())).toBe('cover-slip-2026-10-14-S001.pdf')
  })
  it('says group for several candidates', () => {
    expect(coverSlipFilename(makeBookingDetail({ attendees: [candidate(amy, 1), candidate(ben, 2)] }))).toBe('cover-slip-2026-10-14-group.pdf')
  })
  it('never contains characters that could break the download header', () => {
    const odd = makeBookingDetail({ student: { ...amy, student_code: 'S/0 "1"\r\n' } })
    expect(coverSlipFilename(odd)).toMatch(/^cover-slip-[a-zA-Z0-9-]+\.pdf$/)
  })
})

describe('coverSlipHtml', () => {
  const slips = buildCoverSlips(makeBookingDetail({ attendees: [candidate(amy, 3), candidate(ben, null)], assessment_snapshot: PAPERS }))
  const html = coverSlipHtml(slips)

  it('is one self-contained document with a page per candidate', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html.match(/<section class="slip">/g)).toHaveLength(2)
    expect(html).toContain('size: A4 portrait')
    expect(html).not.toMatch(/<script|<img|<link|src=|href=|url\(/)
  })

  it('prints the fields of a slip', () => {
    for (const text of ['Amy Chan', 'S001', 'Victoria Primary', 'Wednesday 14 October 2026', '09:00 – 11:00 HKT', 'Exam Room · 14/F R3', 'Olivia Ng', 'English and Mathematics', '45 min']) {
      expect(html).toContain(text)
    }
  })

  it('leaves a line to write on where the invigilator or room is not known', () => {
    const blank = coverSlipHtml(buildCoverSlips(makeBookingDetail({ organiser: null, room: null })))
    expect(blank.match(/<span class="blank"><\/span>/g)).toHaveLength(2)
  })

  it('escapes whatever staff typed, so a name cannot inject markup', () => {
    const nasty = { ...amy, first_name: '<script>alert(1)</script>', surname: 'O\'Neil & "Co"' }
    const out = coverSlipHtml(buildCoverSlips(makeBookingDetail({ student: nasty, school: { id: 's', name: '<b>School</b>' } })))
    expect(out).not.toContain('<script>')
    expect(out).not.toContain('<b>School</b>')
    expect(out).toContain('&lt;script&gt;alert(1)&lt;/script&gt; O&#39;Neil &amp; &quot;Co&quot;')
  })

  it('escapes the five characters that matter in HTML', () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe('&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;')
  })
})

describe('cover slip gaps', () => {
  it('names every officer, in the order they were added, and skips an officer without a profile', () => {
    const booking = makeBookingDetail({
      attendees: [candidate(amy, 1), staff('p1', 'Sam', 'officer'), makeAttendee({ id: 'a-ghost', role: 'officer', profile: null }), staff('p2', 'Kim', 'officer')],
    })
    expect(buildCoverSlips(booking)[0].invigilators).toEqual(['Sam Lee', 'Kim Lee'])
  })

  it('falls back to the organiser when the only officer has no profile', () => {
    const booking = makeBookingDetail({ attendees: [candidate(amy, 1), makeAttendee({ id: 'a-ghost', role: 'officer', profile: null })] })
    expect(buildCoverSlips(booking)[0].invigilators).toEqual(['Olivia Ng'])
  })

  it('names the file "student" when the only candidate has no student code', () => {
    expect(coverSlipFilename(makeBookingDetail({ student: { ...amy, student_code: null } }))).toBe('cover-slip-2026-10-14-student.pdf')
  })

  it('takes the file date from local_date', () => {
    expect(coverSlipFilename(makeBookingDetail({ local_date: '2026-11-02' }))).toBe('cover-slip-2026-11-02-S001.pdf')
  })

  it('leaves out the Papers and School rows when the slip has neither', () => {
    const html = coverSlipHtml(buildCoverSlips(makeBookingDetail({ school: null })))
    expect(html).not.toContain('<th>Papers</th>')
    expect(html).not.toContain('<th>School</th>')
  })

  it('escapes paper subjects and durations', () => {
    const html = coverSlipHtml([{ ...buildCoverSlips(makeBookingDetail())[0], papers: [{ subject: '<i>Maths</i>', duration: '"45" <min>' }] }])
    expect(html).not.toContain('<i>Maths</i>')
    expect(html).toContain('&lt;i&gt;Maths&lt;/i&gt;')
    expect(html).toContain('&quot;45&quot; &lt;min&gt;')
  })

  it('does not force a blank page after the last slip', () => {
    const html = coverSlipHtml(buildCoverSlips(makeBookingDetail({ attendees: [candidate(amy, 1), candidate(ben, 2)] })))
    expect(html).toContain('.slip { break-after: page; }')
    expect(html).toContain('.slip:last-child { break-after: auto; }')
    expect(html).toMatch(/<\/section>\n<section class="slip">/)
    expect(html).toMatch(/<\/section><\/body>/)
  })
})
