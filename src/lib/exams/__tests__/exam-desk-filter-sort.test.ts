import { describe, it, expect } from 'vitest'
import {
  deriveExamDeskOptions, filterExamDeskRows, hasExamDeskFilters, reconcileExamDeskFilters, sortExamDeskRows,
} from '../exam-desk-filter-sort'
import { toExamDeskRows } from '../exam-desk-rows'
import { parseExamDeskParams } from '../exam-page-search-params'
import { candidate, emma, lucas, makeDeskBooking } from './exam-desk-fixture'

const rows = toExamDeskRows([
  makeDeskBooking({ id: 'lucas' }),
  makeDeskBooking({
    id: 'emma',
    title: 'Entrance exam: Emma Chan',
    start_at: '2026-10-14T03:00:00.000Z',
    status: 'pending',
    student: emma,
    attendees: [candidate(emma, 2)],
    assessment_snapshot: { label: 'Mathematics paper' },
    application: { entry_year: 2028, school: { id: 'school-charterhouse', name: 'Charterhouse' } },
  }),
  makeDeskBooking({
    id: 'online',
    title: 'Online EFL test',
    start_at: '2026-10-14T06:00:00.000Z',
    location_type: 'online',
    room: null,
    attendees: [candidate(lucas)],
    assessment_snapshot: null,
    application: null,
  }),
])

const ids = (list: typeof rows) => list.map(row => row.bookingId)
const noFilters = { roomId: null, schoolId: null, entryYear: null, q: '' }

describe('deriveExamDeskOptions', () => {
  it('lists each room, school and year once, schools A to Z and years newest first', () => {
    expect(deriveExamDeskOptions(rows)).toEqual({
      rooms: [{ id: 'room-exam', label: 'Exam Room' }],
      schools: [
        { id: 'school-charterhouse', label: 'Charterhouse' },
        { id: 'school-headington', label: 'Headington School' },
      ],
      entryYears: [2028, 2027],
    })
  })
})

describe('reconcileExamDeskFilters', () => {
  const options = deriveExamDeskOptions(rows)
  const base = parseExamDeskParams({}, new Date('2026-10-14T01:00:00.000Z'))

  it('keeps filters that are still among the choices', () => {
    const params = { ...base, roomId: 'room-exam', schoolId: 'school-charterhouse', entryYear: 2028 }
    expect(reconcileExamDeskFilters(params, options)).toEqual(params)
  })
  it('drops a room, school or year that the chosen dates no longer contain', () => {
    const params = { ...base, roomId: 'room-gone', schoolId: 'school-gone', entryYear: 2031 }
    expect(reconcileExamDeskFilters(params, options)).toMatchObject({ roomId: null, schoolId: null, entryYear: null })
  })
})

describe('filterExamDeskRows', () => {
  it('returns everything without filters', () => {
    expect(ids(filterExamDeskRows(rows, noFilters))).toEqual(['lucas', 'emma', 'online'])
  })
  it('filters by room, school and entry year', () => {
    expect(ids(filterExamDeskRows(rows, { ...noFilters, roomId: 'room-exam' }))).toEqual(['lucas', 'emma'])
    expect(ids(filterExamDeskRows(rows, { ...noFilters, schoolId: 'school-charterhouse' }))).toEqual(['emma'])
    expect(ids(filterExamDeskRows(rows, { ...noFilters, entryYear: 2027 }))).toEqual(['lucas'])
  })
  it('combines filters', () => {
    expect(ids(filterExamDeskRows(rows, { ...noFilters, roomId: 'room-exam', entryYear: 2028 }))).toEqual(['emma'])
  })
  it('needs every search word, in any order and any case', () => {
    expect(ids(filterExamDeskRows(rows, { ...noFilters, q: 'NG lucas' }))).toEqual(['lucas', 'online'])
    expect(ids(filterExamDeskRows(rows, { ...noFilters, q: 'chan headington' }))).toEqual([])
    expect(ids(filterExamDeskRows(rows, { ...noFilters, q: 's002' }))).toEqual(['emma'])
  })
})

describe('sortExamDeskRows', () => {
  it('sorts by time in both directions', () => {
    expect(ids(sortExamDeskRows(rows, 'time', 'asc'))).toEqual(['lucas', 'emma', 'online'])
    expect(ids(sortExamDeskRows(rows, 'time', 'desc'))).toEqual(['online', 'emma', 'lucas'])
  })
  it('sorts students by surname and breaks ties by time', () => {
    expect(ids(sortExamDeskRows(rows, 'student', 'asc'))).toEqual(['emma', 'lucas', 'online'])
    expect(ids(sortExamDeskRows(rows, 'student', 'desc'))).toEqual(['lucas', 'online', 'emma'])
  })
  it('keeps rows without a value last in both directions', () => {
    expect(ids(sortExamDeskRows(rows, 'school', 'asc'))).toEqual(['emma', 'lucas', 'online'])
    expect(ids(sortExamDeskRows(rows, 'school', 'desc'))).toEqual(['lucas', 'emma', 'online'])
    expect(ids(sortExamDeskRows(rows, 'year', 'desc'))).toEqual(['emma', 'lucas', 'online'])
    expect(ids(sortExamDeskRows(rows, 'assessment', 'asc'))).toEqual(['lucas', 'emma', 'online'])
  })
  it('sorts by room with the seat, online after named rooms', () => {
    expect(ids(sortExamDeskRows(rows, 'room', 'asc'))).toEqual(['lucas', 'emma', 'online'])
    expect(ids(sortExamDeskRows(rows, 'room', 'desc'))).toEqual(['online', 'emma', 'lucas'])
  })
  it('puts bookings awaiting confirmation first when sorting by status', () => {
    expect(ids(sortExamDeskRows(rows, 'status', 'asc'))).toEqual(['emma', 'lucas', 'online'])
  })
  it('does not change the array it was given', () => {
    const before = ids(rows)
    sortExamDeskRows(rows, 'time', 'desc')
    expect(ids(rows)).toEqual(before)
  })
})

describe('hasExamDeskFilters', () => {
  it('is false for the bare desk and true once anything narrows it', () => {
    expect(hasExamDeskFilters(noFilters)).toBe(false)
    expect(hasExamDeskFilters({ ...noFilters, q: 'ng' })).toBe(true)
    expect(hasExamDeskFilters({ ...noFilters, entryYear: 2027 })).toBe(true)
  })
})
