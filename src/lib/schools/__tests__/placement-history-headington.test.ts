import { describe, it, expect } from 'vitest'
import {
  currentAcademicYearStart,
  defaultPlacementYear,
  figuresForYear,
  placementRate,
  placementYearOptions,
  toPlacementRows,
  type PlacementYearCounts,
} from '../placement-history'

/** Live numbers of Headington School, taken from school_placement_history. */
const headington: PlacementYearCounts[] = [
  { academic_year_start: null, applications: 15, offers: 0, accepted: 0, placed: 0 },
  { academic_year_start: 2020, applications: 952, offers: 215, accepted: 72, placed: 67 },
  { academic_year_start: 2022, applications: 942, offers: 176, accepted: 60, placed: 52 },
  { academic_year_start: 2026, applications: 24, offers: 3, accepted: 2, placed: 2 },
  { academic_year_start: 2021, applications: 1026, offers: 334, accepted: 143, placed: 128 },
  { academic_year_start: 2025, applications: 355, offers: 93, accepted: 22, placed: 21 },
  { academic_year_start: 2023, applications: 759, offers: 193, accepted: 64, placed: 59 },
  { academic_year_start: 2024, applications: 478, offers: 89, accepted: 30, placed: 29 },
]

describe('Headington fixture', () => {
  it('shows 2025 as 355 / 93 / 22 / 21 at 6.2%', () => {
    expect(figuresForYear(headington, '2025')).toEqual({
      label: '2025–26', applications: 355, offers: 93, accepted: 22, placed: 21, rate: '6.2%',
    })
  })
  it('shows the current year 2026 as 24 / 3 / 2 / 2 at 8.3%', () => {
    expect(figuresForYear(headington, '2026')).toMatchObject({ applications: 24, offers: 3, accepted: 2, placed: 2, rate: '8.3%' })
  })
  it('shows the undated bucket as 15 / 0 / 0 / 0 at 0.0%', () => {
    expect(figuresForYear(headington, 'none')).toEqual({
      label: 'No entry year', applications: 15, offers: 0, accepted: 0, placed: 0, rate: '0.0%',
    })
  })
  it('all years equals the sum of every bucket including the undated one', () => {
    const sum = (field: 'applications' | 'offers' | 'accepted' | 'placed') => headington.reduce((n, y) => n + y[field], 0)
    const all = figuresForYear(headington, 'all')
    expect(all).toMatchObject({ applications: sum('applications'), offers: sum('offers'), accepted: sum('accepted'), placed: sum('placed') })
    expect(all.applications).toBe(4551)
    expect(all.accepted).toBe(393)
  })
  it('all years matches the total row of the table', () => {
    expect(figuresForYear(headington, 'all')).toEqual(toPlacementRows(headington).total)
  })
  it('orders the table newest first with the undated row last', () => {
    expect(toPlacementRows(headington).rows.map(r => r.label)).toEqual([
      '2026–27', '2025–26', '2024–25', '2023–24', '2022–23', '2021–22', '2020–21', 'No entry year',
    ])
  })
  it('offers years newest first, then no entry year, then all years', () => {
    expect(placementYearOptions(headington).map(o => o.key)).toEqual(['2026', '2025', '2024', '2023', '2022', '2021', '2020', 'none', 'all'])
  })
  it('opens on the current year when it has data, else the newest', () => {
    expect(defaultPlacementYear(headington, 2026)).toBe('2026')
    expect(defaultPlacementYear(headington, 2027)).toBe('2026')
    expect(defaultPlacementYear(headington, 2019)).toBe('2026')
  })
})

describe('placementRate rounding', () => {
  it('rounds 22 of 355 to 6.2%', () => {
    expect(placementRate(22, 355)).toBe('6.2%')
  })
  it('rounds thirds', () => {
    expect(placementRate(1, 3)).toBe('33.3%')
    expect(placementRate(2, 3)).toBe('66.7%')
  })
  it('gives a dash for no applications', () => {
    expect(placementRate(0, 0)).toBe('—')
  })
})

describe('year options without an undated bucket', () => {
  it('leaves out no entry year when no application lacks one', () => {
    const keys = placementYearOptions([{ academic_year_start: 2025, applications: 1, offers: 0, accepted: 0, placed: 0 }]).map(o => o.key)
    expect(keys).toEqual(['2025', 'all'])
  })
})

describe('defaultPlacementYear with only undated data', () => {
  it('chooses all years', () => {
    expect(defaultPlacementYear([{ academic_year_start: null, applications: 15, offers: 0, accepted: 0, placed: 0 }], 2026)).toBe('all')
  })
})

describe('figuresForYear with an unknown key', () => {
  it('shows zeros and a dash', () => {
    expect(figuresForYear(headington, 'bogus')).toMatchObject({ applications: 0, offers: 0, accepted: 0, placed: 0, rate: '—' })
  })
  it('still names a year that has no data', () => {
    expect(figuresForYear(headington, '2030').label).toBe('2030–31')
  })
})

describe('currentAcademicYearStart at the Hong Kong boundary', () => {
  it('is still the previous year one second before 1 September HK', () => {
    expect(currentAcademicYearStart(new Date('2026-08-31T15:59:59Z'))).toBe(2025)
  })
  it('turns over at 16:00:00 UTC', () => {
    expect(currentAcademicYearStart(new Date('2026-08-31T16:00:00Z'))).toBe(2026)
  })
  it('counts January as the previous start year', () => {
    expect(currentAcademicYearStart(new Date('2027-01-01T00:00:00Z'))).toBe(2026)
    expect(currentAcademicYearStart(new Date('2026-12-31T16:00:00Z'))).toBe(2026)
  })
})
