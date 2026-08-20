import { describe, it, expect } from 'vitest'
import {
  A_LEVEL_BANDS,
  GCSE_LETTERED_BANDS,
  GCSE_NUMERIC_BANDS,
  boardingPercent,
  gcseRegimeFor,
  resolveCurrentFee,
  resolveExamColumns,
  resolveIbColumns,
  resolveYearPair,
  toBandFigures,
  toIbFigures,
} from '../export-shaping'
import type { RawAcademicResult, RawFee } from '../export-types'

const result = (
  school_id: string,
  exam_year: number,
  grade_from: string | null,
  grade_to: string | null,
  result_percentage: number | null
): RawAcademicResult => ({
  school_id,
  exam_year,
  exam_type_id: 1,
  grade_from,
  grade_to,
  result_percentage,
})

const fee = (partial: Partial<RawFee>): RawFee => ({
  school_id: 's1',
  financial_year: '2025-26',
  fee_type_id: 1,
  amount: 50000,
  year_level_from: null,
  year_level_to: null,
  remarks: null,
  ...partial,
})

describe('resolveYearPair', () => {
  it('takes the two most recent years across the whole selection', () => {
    const rows = [
      result('a', 2024, '9', null, 40),
      result('b', 2023, '9', null, 38),
      result('c', 2022, '9', null, 35),
    ]
    expect(resolveYearPair(rows)).toEqual({ currentYear: 2024, priorYear: 2023 })
  })

  it('uses the next published year, not current-1, so a gap year is skipped', () => {
    const rows = [result('a', 2024, '9', null, 40), result('b', 2021, 'A*', null, 30)]
    expect(resolveYearPair(rows)).toEqual({ currentYear: 2024, priorYear: 2021 })
  })

  it('handles a single year', () => {
    expect(resolveYearPair([result('a', 2024, '9', null, 40)])).toEqual({
      currentYear: 2024,
      priorYear: null,
    })
  })

  it('handles no results at all', () => {
    expect(resolveYearPair([])).toEqual({ currentYear: null, priorYear: null })
  })
})

describe('GCSE grade regime', () => {
  it('switches to numeric from 2022', () => {
    expect(gcseRegimeFor(2021)).toBe('lettered')
    expect(gcseRegimeFor(2022)).toBe('numeric')
    expect(gcseRegimeFor(2024)).toBe('numeric')
  })

  it('suppresses a prior year that straddles the regime change', () => {
    const rows = [result('a', 2022, '9', null, 40), result('b', 2021, 'A*', null, 30)]
    const columns = resolveExamColumns(rows, 'gcse')

    expect(columns.currentYear).toBe(2022)
    expect(columns.priorYear).toBeNull()
    expect(columns.priorYearSuppressed).toBe(true)
    expect(columns.bands).toEqual(GCSE_NUMERIC_BANDS)
  })

  it('keeps a prior year inside the same regime', () => {
    const rows = [result('a', 2024, '9', null, 40), result('b', 2023, '9', null, 38)]
    const columns = resolveExamColumns(rows, 'gcse')

    expect(columns.priorYear).toBe(2023)
    expect(columns.priorYearSuppressed).toBe(false)
  })

  it('uses lettered bands when both years predate 2022', () => {
    const rows = [result('a', 2021, 'A*', null, 30), result('b', 2020, 'A*', null, 28)]
    const columns = resolveExamColumns(rows, 'gcse')

    expect(columns.bands).toEqual(GCSE_LETTERED_BANDS)
    expect(columns.priorYear).toBe(2020)
  })

  it('never suppresses for A-Level, which did not change regime', () => {
    const rows = [result('a', 2025, 'A*', null, 30), result('b', 2024, 'A*', null, 28)]
    const columns = resolveExamColumns(rows, 'a_level')

    expect(columns.bands).toEqual(A_LEVEL_BANDS)
    expect(columns.priorYear).toBe(2024)
    expect(columns.priorYearSuppressed).toBe(false)
  })
})

describe('toBandFigures', () => {
  const columns = resolveExamColumns(
    [result('a', 2024, '9', null, 40), result('b', 2023, '9', null, 38)],
    'gcse'
  )

  it('maps a single top grade (null grade_to) onto its band', () => {
    const figures = toBandFigures([result('a', 2024, '9', null, 45.4)], columns, true)
    expect(figures['9'].current).toEqual({ value: 45.4, state: 'ok' })
  })

  it('maps a range onto its band', () => {
    const figures = toBandFigures([result('a', 2024, '9', '7', 87.3)], columns, true)
    expect(figures['9-7'].current).toEqual({ value: 87.3, state: 'ok' })
  })

  it('prints NP when the school publishes nothing for that year', () => {
    const figures = toBandFigures([], columns, true)
    expect(figures['9'].current.state).toBe('np')
  })

  it('prints NP when we simply do not know whether it is offered', () => {
    const figures = toBandFigures([], columns, null)
    expect(figures['9'].current.state).toBe('np')
  })

  it('prints not-applicable when the school does not offer the qualification', () => {
    const figures = toBandFigures([], columns, false)
    expect(figures['9'].current.state).toBe('na')
  })

  it('fills only the year that has data, leaving the other NP', () => {
    const figures = toBandFigures([result('a', 2024, '9', null, 45.4)], columns, true)
    expect(figures['9'].current.state).toBe('ok')
    expect(figures['9'].prior.state).toBe('np')
  })
})

describe('IB', () => {
  it('reads the average diploma score from rows with no grade band', () => {
    const rows = [result('a', 2024, null, null, 35), result('a', 2023, null, null, 32)]
    const columns = resolveIbColumns(rows)
    const figures = toIbFigures(rows, columns, true)

    expect(figures.current).toEqual({ value: 35, state: 'ok' })
    expect(figures.prior).toEqual({ value: 32, state: 'ok' })
  })

  it('ignores per-grade distribution rows, which are not diploma scores', () => {
    const rows = [result('a', 2024, 'HL 7', null, 90.5)]
    const columns = resolveIbColumns(rows)

    expect(columns.currentYear).toBeNull()
    expect(toIbFigures(rows, columns, true).current.state).toBe('np')
  })

  it('rejects a score above the maximum of 45', () => {
    const rows = [result('a', 2024, null, null, 90.5)]
    expect(toIbFigures(rows, resolveIbColumns(rows), true).current.state).toBe('np')
  })

  it('rejects a zero score, which is a placeholder rather than a result', () => {
    const rows = [result('a', 2024, null, null, 0)]
    expect(toIbFigures(rows, resolveIbColumns(rows), true).current.state).toBe('np')
  })

  it('prints not-applicable for a school that does not run IB', () => {
    const columns = resolveIbColumns([result('a', 2024, null, null, 35)])
    expect(toIbFigures([], columns, false).current.state).toBe('na')
  })
})

describe('resolveCurrentFee', () => {
  const COURSE = 1
  const REGISTRATION = 2

  it('ignores a newer year that holds only a registration fee', () => {
    const fees = [
      fee({ financial_year: '2026-27', fee_type_id: REGISTRATION, amount: 300 }),
      fee({ financial_year: '2025-26', fee_type_id: COURSE, amount: 56430, year_level_from: 'Year 9', year_level_to: 'Year 13' }),
    ]
    const resolved = resolveCurrentFee(fees, COURSE)

    expect(resolved?.financialYear).toBe('2025-26')
    expect(resolved?.bands).toHaveLength(1)
  })

  it('orders bands by year level, not lexically', () => {
    const fees = [
      fee({ fee_type_id: COURSE, amount: 59166, year_level_from: 'Year 12', year_level_to: 'Year 13' }),
      fee({ fee_type_id: COURSE, amount: 54000, year_level_from: 'Year 7', year_level_to: 'Year 11' }),
    ]
    const resolved = resolveCurrentFee(fees, COURSE)

    expect(resolved?.bands.map((b) => b.yearLevelFrom)).toEqual(['Year 7', 'Year 12'])
  })

  it('puts Year 9 before Year 10, which a string sort would not', () => {
    const fees = [
      fee({ fee_type_id: COURSE, amount: 2, year_level_from: 'Year 10', year_level_to: 'Year 10' }),
      fee({ fee_type_id: COURSE, amount: 1, year_level_from: 'Year 9', year_level_to: 'Year 9' }),
    ]
    expect(resolveCurrentFee(fees, COURSE)?.bands.map((b) => b.yearLevelFrom)).toEqual([
      'Year 9',
      'Year 10',
    ])
  })

  it('returns null when there is no course fee at all', () => {
    expect(resolveCurrentFee([fee({ fee_type_id: REGISTRATION })], COURSE)).toBeNull()
  })

  it('returns null for a school with no fees', () => {
    expect(resolveCurrentFee([], COURSE)).toBeNull()
  })
})

describe('boardingPercent', () => {
  it('rounds to a whole percent', () => {
    expect(boardingPercent(1073, 136)).toBe(13)
  })

  it('returns null rather than dividing by a zero roll', () => {
    expect(boardingPercent(0, 136)).toBeNull()
  })

  it('returns null when the roll is unknown', () => {
    expect(boardingPercent(null, 136)).toBeNull()
  })

  it('returns null when the boarder count is unknown', () => {
    expect(boardingPercent(1073, null)).toBeNull()
  })
})

describe('mergeFeeBands', () => {
  const COURSE = 1
  const single = (from: string, amount: number) =>
    fee({ fee_type_id: COURSE, amount, year_level_from: from, year_level_to: from })

  it('collapses a flat senior fee into one band', () => {
    const fees = ['Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13'].map((y) => single(y, 49800))
    const bands = resolveCurrentFee(fees, COURSE)!.bands

    expect(bands).toHaveLength(1)
    expect(bands[0]).toMatchObject({ yearLevelFrom: 'Year 9', yearLevelTo: 'Year 13', amount: 49800 })
  })

  it('keeps a separate band where the sixth form costs more', () => {
    const fees = [
      ...['Year 9', 'Year 10', 'Year 11'].map((y) => single(y, 45081)),
      ...['Year 12', 'Year 13'].map((y) => single(y, 49398)),
    ]
    const bands = resolveCurrentFee(fees, COURSE)!.bands

    expect(bands).toHaveLength(2)
    expect(bands[0]).toMatchObject({ yearLevelFrom: 'Year 9', yearLevelTo: 'Year 11', amount: 45081 })
    expect(bands[1]).toMatchObject({ yearLevelFrom: 'Year 12', yearLevelTo: 'Year 13', amount: 49398 })
  })

  it('does not merge across a gap in the schedule', () => {
    const bands = resolveCurrentFee([single('Year 9', 100), single('Year 12', 100)], COURSE)!.bands
    expect(bands).toHaveLength(2)
  })

  it('drops placeholder rows with a zero amount', () => {
    const fees = [single('Year 9', 49800), fee({ fee_type_id: COURSE, amount: 0 })]
    const bands = resolveCurrentFee(fees, COURSE)!.bands

    expect(bands).toHaveLength(1)
    expect(bands[0].amount).toBe(49800)
  })

  it('carries the fee remark, which is what the sheet prints', () => {
    const fees = [
      fee({ fee_type_id: COURSE, amount: 56430, year_level_from: 'Year 9', year_level_to: 'Year 9', remarks: 'Fee inclusive of VAT' }),
    ]
    expect(resolveCurrentFee(fees, COURSE)?.remark).toBe('Fee inclusive of VAT')
  })

  it('takes the first non-empty remark across the year rows', () => {
    const fees = [
      fee({ fee_type_id: COURSE, amount: 1, year_level_from: 'Year 9', year_level_to: 'Year 9', remarks: '  ' }),
      fee({ fee_type_id: COURSE, amount: 2, year_level_from: 'Year 12', year_level_to: 'Year 12', remarks: 'Fee inclusive of VAT' }),
    ]
    expect(resolveCurrentFee(fees, COURSE)?.remark).toBe('Fee inclusive of VAT')
  })

  it('has no remark when none was recorded', () => {
    expect(resolveCurrentFee([fee({ fee_type_id: COURSE, amount: 1 })], COURSE)?.remark).toBeNull()
  })

  it('returns null when every row is a zero placeholder', () => {
    expect(resolveCurrentFee([fee({ fee_type_id: COURSE, amount: 0 })], COURSE)).toBeNull()
  })
})
