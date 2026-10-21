import { describe, it, expect } from 'vitest'
import { NO_YEAR, feesForYear, financialYearLabel, financialYearStart, groupFeesForDisplay, listFinancialYears, sortFeesForDisplay } from '../fee-years'

const fee = (financial_year: string | null, code: string | null, description: string | null, id = description ?? '') => ({
  id, financial_year, description, fee_type: code ? { code } : null,
})

describe('financialYearStart', () => {
  it('reads the year the financial year starts in', () => {
    expect(financialYearStart('2025-26')).toBe(2025)
    expect(financialYearStart('2020')).toBe(2020)
    expect(financialYearStart(' 2019-20 ')).toBe(2019)
  })
  it('gives no year for empty or meaningless values', () => {
    expect(financialYearStart(null)).toBeNull()
    expect(financialYearStart('0')).toBeNull()
    expect(financialYearStart('next year')).toBeNull()
  })
})

describe('listFinancialYears', () => {
  it('lists each year once, newest first, with unusual formats after the regular ones', () => {
    expect(listFinancialYears([
      fee('2023-24', 'course', 'a'), fee('0', 'course', 'b'), fee('2025-26', 'course', 'c'),
      fee('2020', 'course', 'd'), fee('2023-24', 'deposit', 'e'), fee(null, 'course', 'f'), fee('2024-25', 'course', 'g'),
    ])).toEqual(['2025-26', '2024-25', '2023-24', '2020', NO_YEAR])
  })
  it('lists unusual formats newest first when a school has no regular year', () => {
    expect(listFinancialYears([fee('2019', 'course', 'a'), fee('2021', 'course', 'b'), fee('0', 'course', 'c')])).toEqual(['2021', '2019', NO_YEAR])
  })
  it('trims whitespace and gathers blank, empty and meaningless years under one "no year" option', () => {
    expect(listFinancialYears([fee(' 2024-25 ', 'course', 'a'), fee('', 'course', 'b'), fee('   ', 'course', 'c'), fee('0', 'course', 'd')]))
      .toEqual(['2024-25', NO_YEAR])
    expect(financialYearLabel(NO_YEAR)).toBe('No year recorded')
    expect(financialYearLabel('2024-25')).toBe('2024-25')
  })
  it('opens a school whose fees all lack a year on that option rather than on "0"', () => {
    expect(listFinancialYears([fee('0', 'course', 'a'), fee(null, 'deposit', 'b')])).toEqual([NO_YEAR])
  })
  it('is empty without fees', () => {
    expect(listFinancialYears([])).toEqual([])
  })
})

describe('feesForYear', () => {
  const fees = [fee('2024-25', 'course', 'a'), fee('2025-26', 'course', 'b'), fee('2024-25', 'deposit', 'c')]
  it('keeps the fees of one year', () => {
    expect(feesForYear(fees, '2024-25').map(f => f.id)).toEqual(['a', 'c'])
  })
  it('finds fees stored with stray whitespace and an unusual year', () => {
    const odd = [fee(' 2024-25', 'course', 'a'), fee('2020', 'course', 'b')]
    expect(feesForYear(odd, '2024-25').map(f => f.id)).toEqual(['a'])
    expect(feesForYear(odd, '2020').map(f => f.id)).toEqual(['b'])
  })
  it('finds the fees without a usable year', () => {
    const undated = [fee('0', 'course', 'a'), fee(null, 'course', 'b'), fee('2024-25', 'course', 'c')]
    expect(feesForYear(undated, NO_YEAR).map(f => f.id)).toEqual(['a', 'b'])
  })
  it('keeps everything for "all"', () => {
    expect(feesForYear(fees, 'all')).toHaveLength(3)
  })
})

describe('sortFeesForDisplay', () => {
  it('orders course, registration fee, deposit, others, then by year level youngest first', () => {
    const sorted = sortFeesForDisplay([
      fee('2025-26', 'others', 'Uniform'),
      fee('2025-26', 'deposit', 'Deposit'),
      fee('2025-26', 'course', 'Year 10'),
      fee('2025-26', 'registration_fee', 'Registration'),
      fee('2025-26', 'course', 'Year 9'),
      fee('2025-26', 'course', 'Year 12-13'),
      fee('2025-26', 'course', 'Foundation'),
      fee('2025-26', null, 'Mystery'),
    ])
    expect(sorted.map(f => f.description)).toEqual([
      'Year 9', 'Year 10', 'Year 12-13', 'Foundation', 'Registration', 'Deposit', 'Uniform', 'Mystery',
    ])
  })

  it('puts the newest year first when all years are shown, and does not change the input', () => {
    const input = [fee('2023-24', 'course', 'Year 9', 'old'), fee('2025-26', 'course', 'Year 9', 'new'), fee('0', 'course', 'Year 9', 'odd')]
    expect(sortFeesForDisplay(input).map(f => f.id)).toEqual(['new', 'old', 'odd'])
    expect(input.map(f => f.id)).toEqual(['old', 'new', 'odd'])
  })

  it('keeps fees without a type and without a description last in their year', () => {
    const sorted = sortFeesForDisplay([fee('2025-26', null, null, 'x'), fee('2025-26', 'others', null, 'y'), fee('2025-26', 'course', null, 'z')])
    expect(sorted.map(f => f.id)).toEqual(['z', 'y', 'x'])
  })
})

describe('groupFeesForDisplay', () => {
  const typed = (year: string | null, code: string, label: string, description: string) => ({
    id: description, financial_year: year, description, fee_type: { code, label },
  })

  it('puts each fee type of the year under one heading, in display order', () => {
    const groups = groupFeesForDisplay(sortFeesForDisplay([
      typed('2025-26', 'deposit', 'Deposit', 'Deposit'),
      typed('2025-26', 'course', 'Course', 'Year 10'),
      typed('2025-26', 'course', 'Course', 'Year 9'),
    ]), false)
    expect(groups.map(g => [g.label, g.fees.map(f => f.id)])).toEqual([
      ['Course', ['Year 9', 'Year 10']],
      ['Deposit', ['Deposit']],
    ])
  })

  it('names the year as well when all years are shown, including fees without a year', () => {
    const groups = groupFeesForDisplay(sortFeesForDisplay([
      typed('2024-25', 'course', 'Course', 'a'), typed('2025-26', 'course', 'Course', 'b'), typed('0', 'course', 'Course', 'c'),
    ]), true)
    expect(groups.map(g => g.label)).toEqual(['2025-26 · Course', '2024-25 · Course', 'No year recorded · Course'])
  })

  it('keeps one heading per type even when the order interleaves unusual types', () => {
    const groups = groupFeesForDisplay([
      typed('2025-26', 'boarding', 'Boarding', 'A'), typed('2025-26', 'uniform', 'Uniform', 'B'), typed('2025-26', 'boarding', 'Boarding', 'C'),
    ], false)
    expect(groups.map(g => [g.label, g.fees.map(f => f.id)])).toEqual([['Boarding', ['A', 'C']], ['Uniform', ['B']]])
  })

  it('labels fees without a type as Other and returns nothing for no fees', () => {
    expect(groupFeesForDisplay([{ financial_year: '2025-26', description: 'x', fee_type: null }], false)[0].label).toBe('Other')
    expect(groupFeesForDisplay([], true)).toEqual([])
  })
})
