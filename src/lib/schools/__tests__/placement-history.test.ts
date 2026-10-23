import { describe, it, expect } from 'vitest'
import {
  academicYearLabel,
  currentAcademicYearStart,
  defaultPlacementYear,
  figuresForYear,
  placementRate,
  placementYearOptions,
  toPlacementRows,
} from '../placement-history'

describe('academicYearLabel', () => {
  it('writes the school year the way it is spoken', () => {
    expect(academicYearLabel(2026)).toBe('2026–27')
    expect(academicYearLabel(2009)).toBe('2009–10')
  })
  it('keeps two digits across a century', () => {
    expect(academicYearLabel(1999)).toBe('1999–00')
    expect(academicYearLabel(2099)).toBe('2099–00')
  })
  it('names applications without an entry year', () => {
    expect(academicYearLabel(null)).toBe('No entry year')
  })
})

describe('placementRate', () => {
  it('is accepted offers as a share of applications, to one decimal', () => {
    expect(placementRate(12, 24)).toBe('50.0%')
    expect(placementRate(15, 29)).toBe('51.7%')
    expect(placementRate(0, 10)).toBe('0.0%')
    expect(placementRate(10, 10)).toBe('100.0%')
  })
  it('shows a dash when there are no applications', () => {
    expect(placementRate(0, 0)).toBe('—')
  })
  it('shows a dash for zero or negative applications even with offers accepted', () => {
    expect(placementRate(3, 0)).toBe('—')
    expect(placementRate(3, -2)).toBe('—')
  })
  it('rounds to one decimal', () => {
    expect(placementRate(1, 3)).toBe('33.3%')
    expect(placementRate(2, 3)).toBe('66.7%')
    expect(placementRate(1, 8)).toBe('12.5%')
  })
  it('does not clamp when more are accepted than applied', () => {
    expect(placementRate(5, 4)).toBe('125.0%')
  })
})

describe('toPlacementRows', () => {
  const counts = [
    { academic_year_start: 2024, applications: 31, offers: 18, accepted: 15, placed: 14 },
    { academic_year_start: null, applications: 4, offers: 0, accepted: 0, placed: 0 },
    { academic_year_start: 2026, applications: 24, offers: 16, accepted: 12, placed: 10 },
    { academic_year_start: 2025, applications: 29, offers: 19, accepted: 16, placed: 15 },
  ]

  it('lists the newest year first and applications without an entry year last', () => {
    expect(toPlacementRows(counts).rows.map(row => row.label)).toEqual(['2026–27', '2025–26', '2024–25', 'No entry year'])
  })
  it('gives each year its own rate', () => {
    expect(toPlacementRows(counts).rows[0]).toEqual({ label: '2026–27', applications: 24, offers: 16, accepted: 12, placed: 10, rate: '50.0%' })
  })
  it('totals every row and works the rate out from the sums, not from the yearly rates', () => {
    expect(toPlacementRows(counts).total).toEqual({ label: 'All years', applications: 88, offers: 53, accepted: 43, placed: 39, rate: '48.9%' })
  })
  it('has no rows and no total for a school without applications', () => {
    expect(toPlacementRows([])).toEqual({ rows: [], total: null })
  })
  it('does not change the list it was given', () => {
    const before = counts.map(c => c.academic_year_start)
    toPlacementRows(counts)
    expect(counts.map(c => c.academic_year_start)).toEqual(before)
  })
})

describe('toPlacementRows - edge cases', () => {
  it('handles a single year, whose total equals the year', () => {
    const { rows, total } = toPlacementRows([{ academic_year_start: 2025, applications: 3, offers: 2, accepted: 1, placed: 1 }])
    expect(rows).toHaveLength(1)
    expect(total).toEqual({ ...rows[0], label: 'All years' })
    expect(total?.rate).toBe('33.3%')
  })
  it('handles only applications without an entry year', () => {
    const { rows, total } = toPlacementRows([{ academic_year_start: null, applications: 4, offers: 1, accepted: 1, placed: 1 }])
    expect(rows.map(row => row.label)).toEqual(['No entry year'])
    expect(total).toEqual({ label: 'All years', applications: 4, offers: 1, accepted: 1, placed: 1, rate: '25.0%' })
  })
  it('keeps a year with more placed than applications as is', () => {
    const { rows, total } = toPlacementRows([{ academic_year_start: 2024, applications: 2, offers: 3, accepted: 3, placed: 3 }])
    expect(rows[0].rate).toBe('150.0%')
    expect(total?.rate).toBe('150.0%')
  })
  it('sums large numbers without loss', () => {
    const { total } = toPlacementRows([
      { academic_year_start: 2025, applications: 6000, offers: 3000, accepted: 1500, placed: 1400 },
      { academic_year_start: 2024, applications: 5000, offers: 2500, accepted: 1000, placed: 900 },
    ])
    expect(total).toEqual({ label: 'All years', applications: 11000, offers: 5500, accepted: 2500, placed: 2300, rate: '22.7%' })
  })
})

describe('currentAcademicYearStart', () => {
  it('starts the academic year on 1 September in Hong Kong', () => {
    expect(currentAcademicYearStart(new Date('2026-10-23T10:00:00Z'))).toBe(2026)
    expect(currentAcademicYearStart(new Date('2026-08-31T10:00:00Z'))).toBe(2025)
    expect(currentAcademicYearStart(new Date('2026-01-15T10:00:00Z'))).toBe(2025)
  })
  it('switches at midnight Hong Kong, 16:00 UTC the evening before', () => {
    expect(currentAcademicYearStart(new Date('2026-08-31T15:59:00Z'))).toBe(2025)
    expect(currentAcademicYearStart(new Date('2026-08-31T16:30:00Z'))).toBe(2026)
  })
})

describe('year choice', () => {
  const counts = [
    { academic_year_start: 2024, applications: 31, offers: 18, accepted: 15, placed: 14 },
    { academic_year_start: null, applications: 4, offers: 0, accepted: 0, placed: 0 },
    { academic_year_start: 2025, applications: 29, offers: 19, accepted: 16, placed: 15 },
  ]

  it('lists years newest first, then no entry year, then all years', () => {
    expect(placementYearOptions(counts)).toEqual([
      { key: '2025', label: '2025–26' },
      { key: '2024', label: '2024–25' },
      { key: 'none', label: 'No entry year' },
      { key: 'all', label: 'All years' },
    ])
  })
  it('offers only all years when there is no data', () => {
    expect(placementYearOptions([])).toEqual([{ key: 'all', label: 'All years' }])
  })
  it('defaults to the current year when it has applications', () => {
    expect(defaultPlacementYear(counts, 2024)).toBe('2024')
  })
  it('falls back to the newest year with data when the current year has none', () => {
    expect(defaultPlacementYear(counts, 2026)).toBe('2025')
  })
  it('falls back to all years when only undated or no applications exist', () => {
    expect(defaultPlacementYear([], 2026)).toBe('all')
    expect(defaultPlacementYear([counts[1]], 2026)).toBe('all')
  })
  it('gives the figures of one year with the rate from accepted', () => {
    expect(figuresForYear(counts, '2025')).toEqual({
      label: '2025–26', applications: 29, offers: 19, accepted: 16, placed: 15, rate: '55.2%',
    })
  })
  it('sums every year for all years', () => {
    expect(figuresForYear(counts, 'all')).toEqual({
      label: 'All years', applications: 64, offers: 37, accepted: 31, placed: 29, rate: '48.4%',
    })
  })
  it('reads none as the applications without an entry year', () => {
    expect(figuresForYear(counts, 'none')).toMatchObject({ label: 'No entry year', applications: 4, rate: '0.0%' })
  })
  it('shows zeros and a dash for a year with no applications', () => {
    expect(figuresForYear(counts, '2030')).toMatchObject({ applications: 0, accepted: 0, rate: '—' })
  })
})
