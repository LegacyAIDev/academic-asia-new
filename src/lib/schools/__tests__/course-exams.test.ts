import { describe, expect, it } from 'vitest'
import { courseEntryYears, defaultEntryYear, entryYearLabel, entryYearStart, examsForCourse, yearGroupKey } from '../course-exams'

const exam = (entry_year: string | null, year_level: string | null, subject: string) => ({ entry_year, year_level, subject })

describe('course and entrance exam matching', () => {
  it('reads an entry year however it was typed', () => {
    expect(entryYearStart('2032-33')).toBe(2032)
    expect(entryYearStart('2032–33')).toBe(2032)
    expect(entryYearStart('2032')).toBe(2032)
    expect(entryYearStart('Sept 2032')).toBe(2032)
    expect(entryYearStart('')).toBeNull()
    expect(entryYearStart(null)).toBeNull()
    expect(entryYearLabel(2032)).toBe('2032–33')
    expect(entryYearLabel(2099)).toBe('2099–00')
  })

  it('compares year groups loosely', () => {
    expect(yearGroupKey(' Year  9 ')).toBe('year 9')
    expect(yearGroupKey('')).toBeNull()
  })

  it('matches by entry year and year group only', () => {
    const exams = [
      exam('2032-33', 'Year 9', 'Mathematics'),
      exam('2032', 'year 9', 'English'),
      exam('2032-33', 'Year 10', 'Science'),
      exam('2033-34', 'Year 9', 'Reasoning'),
    ]
    expect(examsForCourse(exams, 2032, 'Year 9').map(e => e.subject)).toEqual(['English', 'Mathematics'])
    expect(examsForCourse(exams, 2032, 'Year 7')).toEqual([])
    expect(examsForCourse(exams, null, 'Year 9')).toEqual([])
  })

  it('lists the entry years newest first and picks the coming intake', () => {
    const years = courseEntryYears([{ school_year: '2027-28' }, { school_year: '2032' }, { school_year: null }, { school_year: '2027' }])
    expect(years).toEqual([2032, 2027])
    const nov2026 = new Date('2026-11-16')
    expect(defaultEntryYear([2030, 2027, 2025], nov2026)).toBe(2027)
    expect(defaultEntryYear([2032, 2029], nov2026)).toBe(2029)
    expect(defaultEntryYear([2024, 2023], nov2026)).toBe(2024)
    expect(defaultEntryYear([], nov2026)).toBeNull()
  })
})
