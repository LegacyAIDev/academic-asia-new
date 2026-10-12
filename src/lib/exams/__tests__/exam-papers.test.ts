import { describe, it, expect } from 'vitest'
import { summarisePaperAvailability } from '../exam-paper-availability'
import { filterPaperOptions, paperFilterOptions, paperYearLevels, toSnapshotPaper, totalPaperMinutes } from '../exam-paper-selection'
import type { ExamPaperOption, ExamPaperStatus } from '@/lib/supabase/queries/exam-papers'

const option = (overrides: Partial<ExamPaperOption>): ExamPaperOption => ({
  id: 'paper', subject: 'English', year_level: 'Year 9', entry_year: '2027-28', duration_minutes: 45,
  exam_format: null, paper_request_from_school: false, ...overrides,
})
const status = (overrides: Partial<ExamPaperStatus> = {}): ExamPaperStatus => ({ requestFromSchool: false, files: 0, links: 0, ...overrides })

describe('toSnapshotPaper', () => {
  it('keeps what the booking needs to remember', () => {
    expect(toSnapshotPaper(option({ id: 'p1' }))).toEqual({ id: 'p1', subject: 'English', year_level: 'Year 9', entry_year: '2027-28', duration_minutes: 45 })
  })
  it('names a paper without a subject and drops a nonsensical duration', () => {
    expect(toSnapshotPaper(option({ subject: '  ', duration_minutes: 0 }))).toMatchObject({ subject: 'Paper', duration_minutes: null })
  })
})

describe('paperYearLevels', () => {
  it('lists each year level once, Year 7 before Year 10', () => {
    expect(paperYearLevels([{ year_level: 'Year 10' }, { year_level: 'Year 7' }, { year_level: 'Year 10' }, { year_level: null }]))
      .toEqual(['Year 7', 'Year 10'])
  })
})

describe('totalPaperMinutes', () => {
  it('adds the durations and ignores papers without one', () => {
    expect(totalPaperMinutes([{ duration_minutes: 45 }, { duration_minutes: null }, { duration_minutes: 60 }])).toBe(105)
  })
  it('is null when no paper states a duration', () => {
    expect(totalPaperMinutes([{ duration_minutes: null }])).toBeNull()
    expect(totalPaperMinutes([])).toBeNull()
  })
})

describe('paper filters in the booking dialog', () => {
  const options = [
    option({ id: 'a', entry_year: '2026-27', year_level: 'Year 10' }),
    option({ id: 'b', entry_year: '2027-28', year_level: 'Year 7' }),
    option({ id: 'c', entry_year: '2027-28', year_level: 'Year 10', subject: 'Mathematics' }),
    option({ id: 'd', entry_year: null, year_level: null }),
  ]

  it('offers entry years newest first and year levels in natural order', () => {
    expect(paperFilterOptions(options)).toEqual({ entryYears: ['2027-28', '2026-27'], yearLevels: ['Year 7', 'Year 10'] })
  })
  it('narrows by entry year and year level, and an empty filter matches everything', () => {
    expect(filterPaperOptions(options, '2027-28', null).map(o => o.id)).toEqual(['b', 'c'])
    expect(filterPaperOptions(options, '2027-28', 'Year 10').map(o => o.id)).toEqual(['c'])
    expect(filterPaperOptions(options, null, null)).toHaveLength(4)
  })
})

describe('summarisePaperAvailability', () => {
  const papers = [{ id: 'file' }, { id: 'link' }, { id: 'school' }, { id: 'nothing' }, { id: 'deleted' }]
  const statuses = new Map<string, ExamPaperStatus>([
    ['file', status({ files: 2, links: 1 })],
    ['link', status({ links: 1 })],
    ['school', status({ requestFromSchool: true, files: 1 })],
    ['nothing', status()],
  ])

  it('puts each paper in exactly one group', () => {
    expect(summarisePaperAvailability(papers, statuses)).toEqual({
      uploaded: 1, online: 1, requestFromSchool: 1, notUploaded: 2,
      label: '1 uploaded · 1 online · 1 request from school · 2 not uploaded', canPrint: true,
    })
  })
  it('counts a paper kept by the school as request from school even if a file was uploaded earlier', () => {
    expect(summarisePaperAvailability([{ id: 'school' }], statuses)).toMatchObject({ requestFromSchool: 1, uploaded: 0, canPrint: false })
  })
  it('counts a paper that no longer exists as not uploaded', () => {
    expect(summarisePaperAvailability([{ id: 'deleted' }], statuses)).toMatchObject({ notUploaded: 1, label: '1 not uploaded', canPrint: false })
  })
  it('has nothing to say when no papers were chosen', () => {
    expect(summarisePaperAvailability([], statuses)).toBeNull()
  })
  it('says the papers could not be checked when their state is unknown, and offers nothing to print', () => {
    expect(summarisePaperAvailability(papers, null)).toMatchObject({ label: 'Could not be checked', canPrint: false, notUploaded: 0 })
    expect(summarisePaperAvailability([], null)).toBeNull()
  })
})
