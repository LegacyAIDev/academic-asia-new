/**
 * Fee years for the school's Fees tab. Fees are kept per financial year
 * ("2025-26"), and schools publish at different times: the newest year on
 * record differs from school to school. So the tab opens on each school's own
 * newest year, with every older year one choice away.
 */

import { compareYearLevel, parseYearLevelRange } from './year-levels'

type WithYear = { financial_year: string | null }

const REGULAR_YEAR = /^(\d{4})-\d{2}$/

/** Option for fees whose year is empty or not a year at all (the old system stored "0"). */
export const NO_YEAR = 'none'

/** Year the financial year starts in: "2025-26" → 2025, "2020" → 2020; null when there is no usable year. */
export function financialYearStart(value: string | null): number | null {
  const match = value?.trim().match(/^(\d{4})/)
  if (!match) return null
  const year = Number(match[1])
  return year >= 1900 ? year : null
}

/** The option a fee belongs to: its trimmed year, or NO_YEAR when there is no usable year. */
export function feeYearKey(fee: WithYear): string {
  const year = fee.financial_year?.trim() ?? ''
  return financialYearStart(year) == null ? NO_YEAR : year
}

export function financialYearLabel(key: string): string {
  return key === NO_YEAR ? 'No year recorded' : key
}

/**
 * Distinct financial years, newest first. Real years in another format
 * ("2020") follow the regular ones, and fees without a usable year come last
 * under NO_YEAR, so neither becomes the default while a regular year exists.
 */
export function listFinancialYears(fees: WithYear[]): string[] {
  const keys = [...new Set(fees.map(feeYearKey))]
  const regular = keys.filter(y => REGULAR_YEAR.test(y))
  const unusual = keys.filter(y => y !== NO_YEAR && !REGULAR_YEAR.test(y))
  const newestFirst = (a: string, b: string) =>
    (financialYearStart(b) ?? -1) - (financialYearStart(a) ?? -1) || b.localeCompare(a)
  return [...regular.sort(newestFirst), ...unusual.sort(newestFirst), ...(keys.includes(NO_YEAR) ? [NO_YEAR] : [])]
}

export function feesForYear<T extends WithYear>(fees: T[], year: string | 'all'): T[] {
  return year === 'all' ? fees : fees.filter(f => feeYearKey(f) === year)
}

type DisplayFee = WithYear & { description: string | null; fee_type: { code: string } | null }

const FEE_TYPE_ORDER = ['course', 'registration_fee', 'deposit', 'others']

const typeRank = (fee: DisplayFee) => {
  const rank = FEE_TYPE_ORDER.indexOf(fee.fee_type?.code ?? '')
  return rank === -1 ? FEE_TYPE_ORDER.length : rank
}

/**
 * Display order: newest year first (for "All years"), then course fees,
 * registration fee, deposit and others, then by year level youngest first
 * ("Year 9" before "Year 10"), then by description.
 */
export function sortFeesForDisplay<T extends DisplayFee>(fees: T[]): T[] {
  return [...fees].sort((a, b) =>
    (financialYearStart(b.financial_year) ?? -1) - (financialYearStart(a.financial_year) ?? -1)
    || typeRank(a) - typeRank(b)
    || compareYearLevel(parseYearLevelRange(a.description)?.from ?? null, parseYearLevelRange(b.description)?.from ?? null)
    || (a.description ?? '').localeCompare(b.description ?? '', 'en', { numeric: true }),
  )
}
