import { describe, it, expect } from 'vitest'
import { buildApplicationTimeline, type TimelineApplication, type TimelineBooking } from '../application-timeline'
import { ageInYears, formatDate, formatTime, monthYearLabel, statusStyle } from '../application-display'
import type { ApplicationStatusChange } from '@/lib/supabase/queries/application-status-history'

type Exam = TimelineApplication['exams'][number]
type Deposit = TimelineApplication['deposits'][number]

const emptyApplication: TimelineApplication = {
  registration_date: null, event_date: null, event_time: null, event: null,
  visit_date: null, visit_time: null, school_contact: null, deposits: [], exams: [],
}

const exam = (overrides: Partial<Exam>): Exam => ({
  id: 'e1', subject: 'Maths', apply_year: null, delivery_mode_id: null,
  preferred_date: null, preferred_start_time: null, confirmed_date: null, confirmed_start_time: null,
  room: null, seat_no: null, score: null, remarks: null, status_id: 1, ...overrides,
})

const deposit = (overrides: Partial<Deposit>): Deposit => ({
  id: 'd1', deposit_date: null, amount: null, discount: null, has_commission: null, remarks: null, ...overrides,
})

const booking = (overrides: Partial<TimelineBooking>): TimelineBooking => ({
  id: 'b1', title: 'Exam for Amy', booking_type: 'examination', status: 'confirmed', attendance: null,
  start_at: '2026-11-03T02:00:00Z', local_date: '2026-11-03', assessment_snapshot: null, ...overrides,
})

describe('buildApplicationTimeline', () => {
  it('is empty for an application with no dates', () => {
    expect(buildApplicationTimeline(emptyApplication, [])).toEqual([])
  })

  it('lists every dated record newest first', () => {
    const entries = buildApplicationTimeline({
      ...emptyApplication,
      registration_date: '2026-01-10',
      event_date: '2026-02-01', event_time: '10:00:00', event: { id: 'ev', name: 'London Expo' },
      visit_date: '2026-03-05', visit_time: '14:30:00', school_contact: 'Mrs Smith',
      deposits: [deposit({ deposit_date: '2026-06-01', amount: 5000 })],
      exams: [exam({ confirmed_date: '2026-04-02', confirmed_start_time: '09:00:00', score: 78 })],
    }, [booking({})])

    expect(entries.map(e => [e.kind, e.date, e.time, e.title, e.detail])).toEqual([
      ['booking', '2026-11-03', '10:00', 'Examination', 'Confirmed'],
      ['deposit', '2026-06-01', null, 'Deposit paid', 'Amount 5,000'],
      ['exam', '2026-04-02', '09:00', 'Entrance exam: Maths', 'Score 78'],
      ['visit', '2026-03-05', '14:30', 'School visit', 'With Mrs Smith'],
      ['event', '2026-02-01', '10:00', 'Event: London Expo', null],
      ['registration', '2026-01-10', null, 'Registered with the school', null],
    ])
  })

  it('uses the confirmed exam date before the preferred one and says when it is only preferred', () => {
    const [confirmed] = buildApplicationTimeline({ ...emptyApplication, exams: [
      exam({ preferred_date: '2026-04-01', preferred_start_time: '08:00:00', confirmed_date: '2026-04-09', confirmed_start_time: '13:00:00' }),
    ] }, [])
    expect([confirmed.date, confirmed.time, confirmed.detail]).toEqual(['2026-04-09', '13:00', null])

    const [preferred] = buildApplicationTimeline({ ...emptyApplication, exams: [
      exam({ subject: null, preferred_date: '2026-04-01', preferred_start_time: '08:00:00' }),
    ] }, [])
    expect([preferred.date, preferred.time, preferred.title, preferred.detail])
      .toEqual(['2026-04-01', '08:00', 'Entrance exam: Exam', 'Preferred date, not confirmed'])
  })

  it('leaves out exams and deposits without a date', () => {
    expect(buildApplicationTimeline({
      ...emptyApplication, exams: [exam({})], deposits: [deposit({ amount: 100 })],
    }, [])).toEqual([])
  })

  it('carries the papers, booking status and attendance of a booking', () => {
    const [entry] = buildApplicationTimeline(emptyApplication, [booking({
      assessment_snapshot: { label: 'Maths + English' }, attendance: 'show_up',
    })])
    expect(entry.detail).toBe('Maths + English · Confirmed · Showed up')
  })

  it('shows a cancelled booking as cancelled and falls back to the title for an unknown type', () => {
    const [entry] = buildApplicationTimeline(emptyApplication, [booking({ booking_type: 'legacy', status: 'cancelled' })])
    expect([entry.title, entry.detail]).toEqual(['Exam for Amy', 'Cancelled'])
  })

  it('orders a day by time, latest first, with untimed entries last', () => {
    const entries = buildApplicationTimeline({
      ...emptyApplication,
      registration_date: '2026-05-05',
      visit_date: '2026-05-05', visit_time: '09:00:00',
      event_date: '2026-05-05', event_time: '15:00:00',
    }, [])
    expect(entries.map(e => e.kind)).toEqual(['event', 'visit', 'registration'])
  })
})

describe('buildApplicationTimeline dates', () => {
  it('cuts timestamp dates down to the day so they sort with plain dates', () => {
    const entries = buildApplicationTimeline({
      ...emptyApplication,
      registration_date: '2026-05-05',
      deposits: [deposit({ deposit_date: '2026-05-06T00:00:00+00:00', amount: 1 })],
    }, [])
    expect(entries.map(e => [e.kind, e.date])).toEqual([['deposit', '2026-05-06'], ['registration', '2026-05-05']])
  })
})

describe('application display helpers', () => {
  it('writes month and year as the old system did', () => {
    expect(monthYearLabel(9, 2027)).toBe('Sep-2027')
    expect(monthYearLabel(null, 2027)).toBe('2027')
    expect(monthYearLabel(null, null)).toBe('—')
  })

  it('prints a date column as the same day everywhere', () => {
    expect(formatDate('2026-10-12')).toBe('12 Oct 2026')
    expect(formatDate(null)).toBe('—')
    expect(formatDate('not a date')).toBe('not a date')
  })

  it('shortens times and falls back for an unknown status category', () => {
    expect(formatTime('14:30:00')).toBe('14:30')
    expect(statusStyle('mystery')).toBe(statusStyle('other'))
    expect(statusStyle(null)).toBe(statusStyle('other'))
  })

  it('works out the age on a given day', () => {
    const today = new Date('2026-10-20T00:00:00Z')
    expect(ageInYears('2012-10-20', today)).toBe(14)
    expect(ageInYears('2012-10-21', today)).toBe(13)
    expect(ageInYears(null, today)).toBeNull()
    expect(ageInYears('2030-01-01', today)).toBeNull()
  })
})

describe('buildApplicationTimeline status changes', () => {
  const change = (overrides: Partial<ApplicationStatusChange>): ApplicationStatusChange => ({
    id: 1, changed_at: '2026-10-21T01:30:00Z',
    from_status_id: 7, to_status_id: 17, from_sub_status_id: null, to_sub_status_id: null,
    from_status: 'Awaiting Offer', to_status: 'Offered', from_sub_status: null, to_sub_status: null,
    changed_by_name: 'Jane Lee', ...overrides,
  })

  it('names the old and new status, who changed it and when, in Hong Kong time', () => {
    const [entry] = buildApplicationTimeline(emptyApplication, [], [change({})])
    expect(entry).toEqual({
      date: '2026-10-21', time: '09:30', kind: 'status',
      title: 'Status: Awaiting Offer → Offered', detail: 'by Jane Lee',
    })
  })

  it('dates a late-evening change on the Hong Kong day', () => {
    const [entry] = buildApplicationTimeline(emptyApplication, [], [change({ changed_at: '2026-10-21T17:00:00Z' })])
    expect([entry.date, entry.time]).toEqual(['2026-10-22', '01:00'])
  })

  it('describes the first status of a new application and a system change without a name', () => {
    const [entry] = buildApplicationTimeline(emptyApplication, [], [change({
      from_status_id: null, from_status: null, changed_by_name: null,
    })])
    expect([entry.title, entry.detail]).toEqual(['Status set to Offered', null])
  })

  it('uses the sub-status as the title when only the sub-status moved', () => {
    const [entry] = buildApplicationTimeline(emptyApplication, [], [change({
      from_status_id: 17, from_status: 'Offered', to_sub_status_id: 15, to_sub_status: 'Conditional',
    })])
    expect(entry.title).toBe('Sub-status set to Conditional')
  })

  it('puts the sub-status in the detail when both moved, and says when one was removed', () => {
    const [entry] = buildApplicationTimeline(emptyApplication, [], [change({
      from_sub_status_id: 15, from_sub_status: 'Conditional',
    })])
    expect([entry.title, entry.detail]).toEqual(['Status: Awaiting Offer → Offered', 'Sub-status removed (was Conditional) · by Jane Lee'])
  })

  it('still reads as a change when a status label cannot be loaded', () => {
    const [entry] = buildApplicationTimeline(emptyApplication, [], [change({ from_status: null })])
    expect(entry.title).toBe('Status: unknown (#7) → Offered')
  })

  it('sorts status changes in among the other entries', () => {
    const entries = buildApplicationTimeline({ ...emptyApplication, registration_date: '2026-10-21' }, [], [
      change({ id: 2, changed_at: '2026-11-01T02:00:00Z' }),
      change({ id: 1, changed_at: '2026-10-01T02:00:00Z' }),
    ])
    expect(entries.map(e => [e.kind, e.date])).toEqual([
      ['status', '2026-11-01'], ['registration', '2026-10-21'], ['status', '2026-10-01'],
    ])
  })

  it('says when the status itself was removed', () => {
    const [entry] = buildApplicationTimeline(emptyApplication, [], [change({ to_status_id: null, to_status: null })])
    expect(entry.title).toBe('Status removed (was Awaiting Offer)')
  })

  it('shows the later of two changes on the same Hong Kong day first', () => {
    const entries = buildApplicationTimeline(emptyApplication, [], [
      change({ id: 1, changed_at: '2026-10-21T01:00:00Z', to_status: 'Early' }),
      change({ id: 2, changed_at: '2026-10-21T06:00:00Z', to_status: 'Late' }),
    ])
    expect(entries.map(e => e.time)).toEqual(['14:00', '09:00'])
  })
})
