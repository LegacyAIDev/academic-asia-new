import { describe, it, expect } from 'vitest'
import { bandLabel, formatResultValue, resultsSummaryText, summariseResultsByYear } from '../academic-results-summary'

type Row = Parameters<typeof summariseResultsByYear>[0][number]

const TYPES = {
  gcse: { id: 2, code: 'gcse', label: 'GCSE', country: 'UK' },
  a_level: { id: 1, code: 'a_level', label: 'A Level', country: 'UK' },
  ib: { id: 6, code: 'ib', label: 'IB', country: 'International' },
  higher: { id: 7, code: 'higher', label: 'Higher', country: 'Scotland' },
  pre_u: { id: 4, code: 'pre_u', label: 'Pre-U', country: 'UK' },
  btec: { id: 5, code: 'btec', label: 'BTEC', country: 'UK' },
}

let nextId = 0
const row = (type: keyof typeof TYPES, year: number | null, from: string | null, to: string | null, value: number | null, updated = '2025-01-01'): Row => ({
  id: `r${String(++nextId).padStart(4, '0')}`, exam_year: year, grade_from: from, grade_to: to, result_percentage: value,
  updated_at: updated, created_at: '2024-01-01', exam_type: TYPES[type],
})

describe('bandLabel', () => {
  it('writes a single grade or a cumulative band', () => {
    expect(bandLabel('A*', null, 'a_level')).toBe('A*')
    expect(bandLabel('A*', 'B', 'a_level')).toBe('A*–B')
  })
  it('writes number grades as Jack does: Grade 9, Grades 9–8', () => {
    expect(bandLabel('9', null, 'gcse')).toBe('Grade 9')
    expect(bandLabel('9', '4', 'gcse')).toBe('Grades 9–4')
  })
  it('names a row without a band: IB average point score, otherwise an overall figure', () => {
    expect(bandLabel(null, null, 'ib')).toBe('Average points')
    expect(bandLabel(null, null, 'gcse')).toBe('Overall')
  })
})

describe('formatResultValue', () => {
  it('takes the number the API sends and shows it as a percentage', () => {
    expect(formatResultValue(91, 'A*', 'a_level')).toBe('91%')
    expect(formatResultValue(78.5, '9', 'gcse')).toBe('78.5%')
  })
  it('shows the IB average point score as points, not a percentage', () => {
    expect(formatResultValue(36.5, null, 'ib')).toBe('36.5')
    expect(formatResultValue(60, 'HL 7', 'ib')).toBe('60%')
  })
  it('shows a dash for no value', () => {
    expect(formatResultValue(null, 'A*', 'a_level')).toBe('—')
    expect(formatResultValue(Number.NaN, 'A*', 'a_level')).toBe('—')
  })
})

/** The published figures of one year's line for an exam type (empty columns left out), for short assertions. */
const line = (years: ReturnType<typeof summariseResultsByYear>, year: number, examType: string) =>
  years.find(y => y.year === year)?.lines.find(l => l.examType === examType)?.figures
    .filter(f => f.value !== null).map(f => `${f.band} ${f.value}`)

/** Every column of one year's line, empty ones as "—". */
const columns = (years: ReturnType<typeof summariseResultsByYear>, year: number, examType: string) =>
  years.find(y => y.year === year)?.lines.find(l => l.examType === examType)?.figures.map(f => `${f.band} ${f.value ?? '—'}`)

describe('summariseResultsByYear', () => {
  it('is empty without results', () => {
    expect(summariseResultsByYear([], 'latest3')).toEqual([])
  })

  it('gives one block per year, newest first, with the bands narrowest first', () => {
    const years = summariseResultsByYear([
      row('a_level', 2024, 'A*', 'B', 80),
      row('a_level', 2024, 'A*', null, 30),
      row('a_level', 2024, 'A*', 'A', 55),
      row('a_level', 2025, 'A*', null, 32),
      row('a_level', 2025, 'A*', 'E', 99),
    ], 'latest3')
    expect(years.map(y => y.year)).toEqual([2025, 2024])
    expect(line(years, 2025, 'A Level')).toEqual(['A* 32%', 'A*–E 99%'])
    expect(line(years, 2024, 'A Level')).toEqual(['A* 30%', 'A*–A 55%', 'A*–B 80%'])
  })

  it('puts GCSE first, then A Level, then the other exam types by name, and leaves out rows without a year', () => {
    const [year] = summariseResultsByYear([
      row('higher', 2023, 'A', null, 40), row('ib', 2023, null, null, 35), row('a_level', 2023, 'A*', null, 30),
      row('btec', 2023, 'D*', 'D', 50), row('gcse', 2023, '9', null, 20), row('gcse', null, '9', null, 99),
    ], 'all')
    expect(year.lines.map(l => l.examType)).toEqual(['GCSE', 'A Level', 'BTEC', 'Higher', 'IB'])
    expect(line([year], 2023, 'GCSE')).toEqual(['Grade 9 20%'])
  })

  it('orders GCSE number bands 9, 9–8 … 9–4 and letter bands before them', () => {
    const years = summariseResultsByYear([
      row('gcse', 2022, '9', '4', 95), row('gcse', 2022, '9', '7', 70), row('gcse', 2022, '9', null, 20),
      row('gcse', 2022, '9', '8', 45), row('gcse', 2022, 'A*', 'A', 80), row('gcse', 2022, 'A*', null, 50),
    ], 'all')
    expect(line(years, 2022, 'GCSE')).toEqual(['A* 50%', 'A*–A 80%', 'Grade 9 20%', 'Grades 9–8 45%', 'Grades 9–7 70%', 'Grades 9–4 95%'])
  })

  it('gives every year the same columns, so a band sits in the same place each year', () => {
    const years = summariseResultsByYear([
      row('a_level', 2025, 'A*', 'A', 60), row('a_level', 2025, 'A*', 'B', 83),
      row('a_level', 2024, 'A*', null, 24), row('a_level', 2024, 'A*', 'A', 58), row('a_level', 2024, 'A*', 'C', 98),
    ], 'all')
    expect(columns(years, 2025, 'A Level')).toEqual(['A* —', 'A*–A 60%', 'A*–B 83%', 'A*–C —'])
    expect(columns(years, 2024, 'A Level')).toEqual(['A* 24%', 'A*–A 58%', 'A*–B —', 'A*–C 98%'])
  })

  it('keeps number and letter grades apart, so a year on one scale gets no empty columns for the other', () => {
    const years = summariseResultsByYear([row('gcse', 2022, '9', '7', 66), row('gcse', 2021, 'A*', 'A', 80)], 'all')
    expect(columns(years, 2022, 'GCSE')).toEqual(['Grades 9–7 66%'])
    expect(columns(years, 2021, 'GCSE')).toEqual(['A*–A 80%'])
  })

  it('only lines up columns with the years on screen', () => {
    const rows = [row('a_level', 2025, 'A*', null, 30), row('a_level', 2015, 'A*', 'B', 70)]
    expect(columns(summariseResultsByYear(rows, 'latest3'), 2025, 'A Level')).toEqual(['A* 30%', 'A*–B —'])
    expect(columns(summariseResultsByYear([...rows, row('a_level', 2024, 'A*', null, 1), row('a_level', 2023, 'A*', null, 2)], 'latest3'), 2025, 'A Level'))
      .toEqual(['A* 30%'])
  })

  it('measures the bar under each figure: a percentage of 100, IB average points of 45', () => {
    const years = summariseResultsByYear([
      row('a_level', 2024, 'A*', null, 37), row('a_level', 2024, 'A*', 'B', 120), row('ib', 2024, null, null, 36),
    ], 'all')
    const shares = years[0].lines.flatMap(l => l.figures.map(f => f.share))
    expect(shares).toEqual([0.37, 1, 0.8])
  })

  it('draws no bar for a value that is not a number', () => {
    const [year] = summariseResultsByYear([row('a_level', 2024, 'A*', null, Number.NaN)], 'all')
    expect(year.lines[0].figures[0].share).toBeNull()
  })

  it('counts the most recent years that have results, so a gap does not shorten the range', () => {
    const rows = [
      row('a_level', 2025, 'A*', null, 1), row('gcse', 2020, '9', null, 2),
      row('a_level', 2015, 'A*', null, 3), row('a_level', 2010, 'A*', null, 4),
    ]
    expect(summariseResultsByYear(rows, 'latest3').map(y => y.year)).toEqual([2025, 2020, 2015])
    expect(summariseResultsByYear(rows, 'last5')).toHaveLength(4)
    const sixYears = [2025, 2024, 2023, 2022, 2021, 2020].map((year, i) => row('gcse', year, '9', null, i))
    expect(summariseResultsByYear(sixYears, 'last5').map(y => y.year)).toEqual([2025, 2024, 2023, 2022, 2021])
    expect(summariseResultsByYear(sixYears, 'all')).toHaveLength(6)
  })

  it('does not spend a place in the range on a year whose records have no figure', () => {
    const years = summariseResultsByYear([
      row('gcse', 2025, '9', null, null), row('gcse', 2024, '9', null, 1), row('gcse', 2023, '9', null, 2), row('gcse', 2022, '9', null, 3),
    ], 'latest3')
    expect(years.map(y => y.year)).toEqual([2024, 2023, 2022])
  })

  it('puts a record without an exam type under "Other", after the named types', () => {
    const [year] = summariseResultsByYear([{ ...row('gcse', 2023, 'A', null, 10), exam_type: null }, row('ib', 2023, null, null, 35)], 'all')
    expect(year.lines.map(l => l.examType)).toEqual(['IB', 'Other'])
  })

  it('shows the most recently updated record when a year has the same band twice', () => {
    const years = summariseResultsByYear([
      row('a_level', 2024, 'A*', null, 30, '2025-01-01T00:00:00Z'),
      row('a_level', 2024, 'A*', null, 33, '2025-06-01T00:00:00Z'),
      row('a_level', 2024, 'A*', null, 31, '2025-03-01T00:00:00Z'),
    ], 'all')
    expect(line(years, 2024, 'A Level')).toEqual(['A* 33%'])
  })

  it('settles two records updated at the same moment by id, whatever order the query returned them in', () => {
    const first = { ...row('a_level', 2024, 'A*', null, 30, '2025-05-05'), id: 'b' }
    const second = { ...row('a_level', 2024, 'A*', null, 31, '2025-05-05'), id: 'a' }
    expect(line(summariseResultsByYear([first, second], 'all'), 2024, 'A Level')).toEqual(['A* 30%'])
    expect(line(summariseResultsByYear([second, first], 'all'), 2024, 'A Level')).toEqual(['A* 30%'])
  })

  it('keeps a record with a null updated_at but a later created_at against an older updated one', () => {
    const older = row('a_level', 2024, 'A*', null, 30, '2025-01-01')
    const created = { ...row('a_level', 2024, 'A*', null, 35, '2025-01-01'), updated_at: null, created_at: '2025-09-01' }
    expect(line(summariseResultsByYear([older, created], 'all'), 2024, 'A Level')).toEqual(['A* 35%'])
    expect(line(summariseResultsByYear([created, older], 'all'), 2024, 'A Level')).toEqual(['A* 35%'])
  })

  it('leaves out records without a figure, and a year that has nothing else', () => {
    const years = summariseResultsByYear([row('gcse', 2022, '9', '4', null), row('gcse', 2022, '9', '7', 77), row('gcse', 2021, '9', null, null)], 'all')
    expect(years.map(y => y.year)).toEqual([2022])
    expect(line(years, 2022, 'GCSE')).toEqual(['Grades 9–7 77%'])
  })

  it('puts the IB average point score last, as points', () => {
    const years = summariseResultsByYear([
      row('ib', 2024, null, null, 36.40), row('ib', 2024, 'HL 7', null, 25), row('ib', 2024, 'SL 7', null, 30),
    ], 'all')
    expect(line(years, 2024, 'IB')).toEqual(['HL 7 25%', 'SL 7 30%', 'Average points 36.4'])
  })

  it('gives "Overall" to a non-IB row without a band, after the real bands', () => {
    const years = summariseResultsByYear([row('gcse', 2022, null, null, 60), row('gcse', 2022, '9', null, 20)], 'all')
    expect(line(years, 2022, 'GCSE')).toEqual(['Grade 9 20%', 'Overall 60%'])
  })

  it('handles a school with only Scottish exam types', () => {
    const years = summariseResultsByYear([
      row('higher', 2023, 'A', 'C', 90), row('higher', 2023, 'A', null, 40), row('higher', 2023, 'A', 'B', 70),
    ], 'latest3')
    expect(years).toEqual([{ year: 2023, lines: [{ code: 'higher', examType: 'Higher', figures: [
      { band: 'A', value: '40%', share: 0.4 }, { band: 'A–B', value: '70%', share: 0.7 }, { band: 'A–C', value: '90%', share: 0.9 },
    ] }] }])
  })

  it('orders Pre-U words (Distinction first) and points (D1 before M1) by their lower end', () => {
    const words = summariseResultsByYear([
      row('pre_u', 2020, 'Distinction', 'Pass', 100), row('pre_u', 2020, 'Distinction', null, 56), row('pre_u', 2020, 'Distinction', 'Merit', 92),
    ], 'all')
    expect(line(words, 2020, 'Pre-U')).toEqual(['Distinction 56%', 'Distinction–Merit 92%', 'Distinction–Pass 100%'])
    const points = summariseResultsByYear([
      row('pre_u', 2020, 'D1', 'M2', 1), row('pre_u', 2020, 'D1', 'D3', 2), row('pre_u', 2020, 'D1', 'D2', 3), row('pre_u', 2020, 'D1', null, 4),
    ], 'all')
    expect(line(points, 2020, 'Pre-U')?.map(f => f.split(' ')[0])).toEqual(['D1', 'D1–D2', 'D1–D3', 'D1–M2'])
  })

  it('ranks IB higher and standard level grades best first, and grades off any known scale after them by name', () => {
    const ib = summariseResultsByYear([
      row('ib', 2020, 'SL 7', null, 1), row('ib', 2020, 'HL 3', null, 2), row('ib', 2020, 'HL 7', null, 3),
      row('ib', 2020, 'HL 7', 'HL 5', 4), row('ib', 2020, '7', null, 5),
    ], 'all')
    expect(line(ib, 2020, 'IB')?.map(f => f.replace(/ \d+%$/, ''))).toEqual(['Grade 7', 'HL 7', 'HL 7–HL 5', 'HL 3', 'SL 7'])
    const btec = summariseResultsByYear([
      row('btec', 2020, 'Band 10', null, 1), row('btec', 2020, 'Band 2', null, 2), row('btec', 2020, 'A', null, 3),
    ], 'all')
    expect(line(btec, 2020, 'BTEC')?.map(f => f.replace(/ \d+%$/, ''))).toEqual(['A', 'Band 2', 'Band 10'])
  })
})

describe('resultsSummaryText', () => {
  it('writes one line per year, exam types separated, ready to paste into a message', () => {
    const years = summariseResultsByYear([
      row('gcse', 2025, '9', null, 47), row('gcse', 2025, '9', '8', 75), row('a_level', 2025, 'A*', null, 37),
      row('a_level', 2024, 'A*', null, 32),
    ], 'all')
    expect(resultsSummaryText(years)).toBe('2025 — GCSE: Grade 9 47%, Grades 9–8 75% · A Level: A* 37%\n2024 — A Level: A* 32%')
    const withGap = summariseResultsByYear([row('a_level', 2025, 'A*', 'A', 60), row('a_level', 2024, 'A*', null, 24)], 'all')
    expect(resultsSummaryText(withGap)).toBe('2025 — A Level: A*–A 60%\n2024 — A Level: A* 24%')
    expect(resultsSummaryText([])).toBe('')
  })

  it('copies the IB average point score as points', () => {
    expect(resultsSummaryText(summariseResultsByYear([row('ib', 2024, null, null, 36.4)], 'all'))).toBe('2024 — IB: Average points 36.4')
  })
})
