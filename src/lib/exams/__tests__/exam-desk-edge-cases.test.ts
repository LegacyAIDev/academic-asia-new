import { describe, it, expect } from 'vitest'
import { deriveExamDeskOptions, filterExamDeskRows, reconcileExamDeskFilters, sortExamDeskRows } from '../exam-desk-filter-sort'
import { examCandidates, toExamDeskRows } from '../exam-desk-rows'
import { examsHref, isDeskDate, parseExamDeskParams, parseExamListParams } from '../exam-page-search-params'
import { candidate, emma, lucas, makeDeskBooking } from './exam-desk-fixture'

const now = new Date('2026-03-15T03:00:00.000Z')
const noFilters = { roomId: null, schoolId: null, entryYear: null, q: '' }
const ids = (list: { bookingId: string }[]) => list.map(row => row.bookingId)

describe('date edge cases', () => {
  it('knows leap days, including the century rule', () => {
    expect(isDeskDate('2028-02-29')).toBe(true)
    expect(isDeskDate('2000-02-29')).toBe(true)
    expect(isDeskDate('2026-02-29')).toBe(false)
    expect(isDeskDate('2100-02-29')).toBe(false)
  })
  it('accepts the first and last supported day and rejects the ones outside', () => {
    expect(isDeskDate('2000-01-01')).toBe(true)
    expect(isDeskDate('2100-12-31')).toBe(true)
    expect(isDeskDate('1999-12-31')).toBe(false)
    expect(isDeskDate('2101-01-01')).toBe(false)
  })
  it('keeps a range across a year boundary and across a leap day', () => {
    expect(parseExamDeskParams({ from: '2026-12-30', to: '2027-01-02' }, now)).toMatchObject({ to: '2027-01-02', rangeClamped: false })
    expect(parseExamDeskParams({ from: '2028-02-28', to: '2028-03-01' }, now)).toMatchObject({ to: '2028-03-01', rangeClamped: false })
  })
  it('counts the leap day when shortening a long range', () => {
    expect(parseExamDeskParams({ from: '2027-12-31', to: '2028-12-31' }, now)).toMatchObject({ to: '2028-03-02', rangeClamped: true })
    expect(parseExamDeskParams({ from: '2028-01-01', to: '2028-12-31' }, now).to).toBe('2028-03-03')
  })
  it('treats a lone to date as a range starting today', () => {
    expect(parseExamDeskParams({ to: '2026-03-20' }, now)).toMatchObject({ from: '2026-03-15', to: '2026-03-20' })
  })
  it('falls back to today when a lone to date is in the past', () => {
    expect(parseExamDeskParams({ to: '2026-03-01' }, now)).toMatchObject({ from: '2026-03-15', to: '2026-03-15' })
  })
  it('keeps a to date equal to from', () => {
    expect(parseExamDeskParams({ from: '2026-04-01', to: '2026-04-01' }, now).to).toBe('2026-04-01')
  })
  it('allows an open-ended list range with only one side', () => {
    expect(parseExamListParams({ from: '2026-04-01' })).toMatchObject({ from: '2026-04-01', to: null })
  })
})

describe('repeated url parameters', () => {
  it('reads the first value of every repeated desk parameter', () => {
    const parsed = parseExamDeskParams({ year: ['2027', '2028'], q: ['ng', 'chan'], from: ['2026-04-01', '2026-05-01'] }, now)
    expect(parsed).toMatchObject({ entryYear: 2027, q: 'ng', from: '2026-04-01' })
  })
  it('writes one value per key when the current url repeats a parameter', () => {
    expect(examsHref({ sort: ['school', 'room'], from: ['2026-04-01', '2026-05-01'] })).toBe('/exams?from=2026-04-01&sort=school')
  })
  it('encodes search text and accepts numbers in a patch', () => {
    expect(examsHref({}, { q: 'a b&c', page: 2 })).toBe('/exams?q=a+b%26c&page=2')
  })
  it('treats an empty string patch as removal', () => {
    expect(examsHref({ q: 'ng' }, { q: '' })).toBe('/exams')
  })
})

describe('search with extra whitespace', () => {
  const rows = toExamDeskRows([makeDeskBooking({ id: 'a' }), makeDeskBooking({ id: 'b', title: 'Entrance exam: Emma Chan', student: emma, attendees: [candidate(emma, 1)] })])
  it('ignores leading, trailing and repeated spaces and tabs', () => {
    expect(ids(filterExamDeskRows(rows, { ...noFilters, q: '  lucas \t  ng  ' }))).toEqual(['a'])
  })
  it('matches everything for a search made only of spaces', () => {
    expect(ids(filterExamDeskRows(rows, { ...noFilters, q: '   ' }))).toEqual(['a', 'b'])
  })
})

describe('group bookings with a candidate that has no student row', () => {
  const orphan = { ...candidate(lucas, 1), student_id: 'gone', student: null }
  const bare = makeDeskBooking({ id: 'bare', booking_type: 'group_examination', student: null, attendees: [orphan] })

  it('lists nobody and still builds a row', () => {
    expect(examCandidates(bare)).toEqual([])
    expect(toExamDeskRows([bare])[0]).toMatchObject({ candidates: [], seatLabel: null })
  })
  it('falls back to the booking student when every candidate is unresolved', () => {
    const withStudent = makeDeskBooking({ attendees: [orphan] })
    expect(examCandidates(withStudent).map(c => c.name)).toEqual(['Lucas Ng'])
  })
  it('sorts it last by student in both directions', () => {
    const rows = toExamDeskRows([bare, makeDeskBooking({ id: 'lucas' }), makeDeskBooking({ id: 'emma', student: emma, attendees: [candidate(emma, 1)] })])
    expect(ids(sortExamDeskRows(rows, 'student', 'asc'))).toEqual(['emma', 'lucas', 'bare'])
    expect(ids(sortExamDeskRows(rows, 'student', 'desc'))).toEqual(['lucas', 'emma', 'bare'])
  })
})

describe('sorting ties and missing values', () => {
  const same = { school: null, application: { entry_year: 2027, school: { id: 's', name: 'Same School' } } }
  it('breaks ties by start time then id, whatever the direction', () => {
    const rows = toExamDeskRows([
      makeDeskBooking({ id: 'c', ...same, start_at: '2026-10-14T05:00:00.000Z' }),
      makeDeskBooking({ id: 'b', ...same, start_at: '2026-10-14T01:00:00.000Z' }),
      makeDeskBooking({ id: 'a', ...same, start_at: '2026-10-14T01:00:00.000Z' }),
    ])
    expect(ids(sortExamDeskRows(rows, 'school', 'asc'))).toEqual(['a', 'b', 'c'])
    expect(ids(sortExamDeskRows(rows, 'school', 'desc'))).toEqual(['a', 'b', 'c'])
    expect(ids(sortExamDeskRows(rows, 'year', 'desc'))).toEqual(['a', 'b', 'c'])
  })
  it('puts a physical booking without a room after rooms in both directions', () => {
    const rows = toExamDeskRows([makeDeskBooking({ id: 'none', room: null, location_type: 'room' }), makeDeskBooking({ id: 'room' })])
    expect(ids(sortExamDeskRows(rows, 'room', 'asc'))).toEqual(['room', 'none'])
    expect(ids(sortExamDeskRows(rows, 'room', 'desc'))).toEqual(['room', 'none'])
  })
  it('orders seats numerically inside one room', () => {
    const rows = toExamDeskRows([
      makeDeskBooking({ id: 'ten', attendees: [candidate(lucas, 10)] }),
      makeDeskBooking({ id: 'two', attendees: [candidate(lucas, 2)] }),
    ])
    expect(ids(sortExamDeskRows(rows, 'room', 'asc'))).toEqual(['two', 'ten'])
  })
  it('sorts entry years as numbers', () => {
    const rows = toExamDeskRows([
      makeDeskBooking({ id: 'y2100', application: { entry_year: 2100, school: null } }),
      makeDeskBooking({ id: 'y2027', application: { entry_year: 2027, school: null } }),
      makeDeskBooking({ id: 'none', application: null }),
    ])
    expect(ids(sortExamDeskRows(rows, 'year', 'asc'))).toEqual(['y2027', 'y2100', 'none'])
    expect(ids(sortExamDeskRows(rows, 'year', 'desc'))).toEqual(['y2100', 'y2027', 'none'])
  })
  it('sorts a blank assessment as missing', () => {
    const rows = toExamDeskRows([makeDeskBooking({ id: 'blank', assessment_snapshot: { label: ' ' } }), makeDeskBooking({ id: 'maths', assessment_snapshot: { label: 'Maths' } })])
    expect(ids(sortExamDeskRows(rows, 'assessment', 'desc'))).toEqual(['maths', 'blank'])
  })
})

describe('options and reconcile with nothing to offer', () => {
  it('derives empty choices from no rows', () => {
    expect(deriveExamDeskOptions([])).toEqual({ rooms: [], schools: [], entryYears: [] })
  })
  it('names a school without a name "Unnamed"', () => {
    const rows = toExamDeskRows([makeDeskBooking({ application: { entry_year: 2027, school: { id: 's1', name: '' } } })])
    expect(deriveExamDeskOptions(rows).schools).toEqual([{ id: 's1', label: 'Unnamed' }])
  })
  it('clears every filter when there are no choices, and keeps the rest', () => {
    const params = { ...parseExamDeskParams({ q: 'ng', sort: 'room' }, now), roomId: 'r', schoolId: 's', entryYear: 2027 }
    expect(reconcileExamDeskFilters(params, deriveExamDeskOptions([]))).toMatchObject({
      roomId: null, schoolId: null, entryYear: null, q: 'ng', sort: 'room',
    })
  })
})
