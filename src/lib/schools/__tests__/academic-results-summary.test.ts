import { describe, it, expect } from 'vitest'
import { bandLabel, displayShare, formatResultValue, summariseAcademicResults } from '../academic-results-summary'

type Row = Parameters<typeof summariseAcademicResults>[0][number]

const TYPES = {
  gcse: { id: 2, code: 'gcse', label: 'GCSE', country: 'UK' },
  a_level: { id: 1, code: 'a_level', label: 'A Level', country: 'UK' },
  ib: { id: 6, code: 'ib', label: 'IB', country: 'International' },
  higher: { id: 7, code: 'higher', label: 'Higher', country: 'Scotland' },
  pre_u: { id: 4, code: 'pre_u', label: 'Pre-U', country: 'UK' },
  btec: { id: 5, code: 'btec', label: 'BTEC', country: 'UK' },
}

let nextId = 0
const row = (type: keyof typeof TYPES, year: number | null, from: string | null, to: string | null, value: string | null, updated = '2025-01-01'): Row => ({
  id: `r${String(++nextId).padStart(4, '0')}`, exam_year: year, grade_from: from, grade_to: to, result_percentage: value,
  updated_at: updated, created_at: '2024-01-01', exam_type: TYPES[type],
})

describe('bandLabel', () => {
  it('writes a single grade or a cumulative band', () => {
    expect(bandLabel('A*', null, 'a_level')).toBe('A*')
    expect(bandLabel('A*', 'B', 'a_level')).toBe('A*–B')
  })
  it('names a row without a band: IB average point score, otherwise an overall figure', () => {
    expect(bandLabel(null, null, 'ib')).toBe('Average points')
    expect(bandLabel(null, null, 'gcse')).toBe('Overall')
  })
})

describe('formatResultValue', () => {
  it('shows percentages without trailing zeros', () => {
    expect(formatResultValue('91.00', 'A*', 'a_level')).toBe('91%')
    expect(formatResultValue('78.5', '9', 'gcse')).toBe('78.5%')
  })
  it('shows the IB average point score as points, not a percentage', () => {
    expect(formatResultValue('36.50', null, 'ib')).toBe('36.5')
    expect(formatResultValue('60', 'HL 7', 'ib')).toBe('60%')
  })
  it('shows a dash for no value and keeps text that is not a number', () => {
    expect(formatResultValue(null, 'A*', 'a_level')).toBe('—')
    expect(formatResultValue('  ', 'A*', 'a_level')).toBe('—')
    expect(formatResultValue('n/a', 'A*', 'a_level')).toBe('n/a')
    expect(formatResultValue('12abc', 'A*', 'a_level')).toBe('12abc')
  })
})

describe('displayShare', () => {
  it('reads a percentage out of 100 and IB points out of 45', () => {
    expect(displayShare('80%')).toBe(0.8)
    expect(displayShare('36')).toBe(0.8)
  })
  it('keeps the share between 0 and 1', () => {
    expect(displayShare('120%')).toBe(1)
    expect(displayShare('-5%')).toBe(0)
  })
  it('gives no share for dashes, free text or nothing', () => {
    expect(displayShare(null)).toBeNull()
    expect(displayShare('—')).toBeNull()
    expect(displayShare('n/a')).toBeNull()
  })
})

describe('summariseAcademicResults', () => {
  it('is empty without results', () => {
    expect(summariseAcademicResults([], 'latest3')).toEqual([])
  })

  it('pivots one line per year with bands as columns, narrowest first, newest year first', () => {
    const [block] = summariseAcademicResults([
      row('a_level', 2024, 'A*', 'B', '80'),
      row('a_level', 2024, 'A*', null, '30'),
      row('a_level', 2024, 'A*', 'A', '55'),
      row('a_level', 2025, 'A*', null, '32'),
      row('a_level', 2025, 'A*', 'E', '99'),
    ], 'latest3')
    expect(block.examType).toBe('A Level')
    expect(block.bands).toEqual(['A*', 'A*–A', 'A*–B', 'A*–E'])
    expect(block.rows).toEqual([
      { year: 2025, values: ['32%', null, null, '99%'] },
      { year: 2024, values: ['30%', '55%', '80%', null] },
    ])
  })

  it('orders GCSE number bands 9, 9–8 … 9–4 and puts letter bands before them when both are shown', () => {
    const [block] = summariseAcademicResults([
      row('gcse', 2022, '9', '4', '95'), row('gcse', 2022, '9', '7', '70'), row('gcse', 2022, '9', null, '20'),
      row('gcse', 2022, '9', '8', '45'), row('gcse', 2021, 'A*', 'A', '80'), row('gcse', 2021, 'A*', null, '50'),
    ], 'all')
    expect(block.bands).toEqual(['A*', 'A*–A', '9', '9–8', '9–7', '9–4'])
  })

  it('limits each exam type to its own most recent years and only shows the columns those years use', () => {
    const blocks = summariseAcademicResults([
      row('gcse', 2024, '9', '7', '70'), row('gcse', 2023, '9', '7', '68'), row('gcse', 2022, '9', '7', '66'),
      row('gcse', 2021, 'A*', 'A', '80'),
      row('a_level', 2019, 'A*', 'B', '85'),
    ], 'latest3')
    expect(blocks.map(b => [b.examType, b.rows.map(r => r.year), b.bands])).toEqual([
      ['GCSE', [2024, 2023, 2022], ['9–7']],
      ['A Level', [2019], ['A*–B']],
    ])
  })

  it('counts years that have results, so a gap does not shorten the table', () => {
    const [block] = summariseAcademicResults([
      row('a_level', 2025, 'A*', null, '1'), row('a_level', 2020, 'A*', null, '2'),
      row('a_level', 2015, 'A*', null, '3'), row('a_level', 2010, 'A*', null, '4'),
    ], 'latest3')
    expect(block.rows.map(r => r.year)).toEqual([2025, 2020, 2015])
    expect(summariseAcademicResults([row('a_level', 2025, 'A*', null, '1')], 'last5')[0].rows).toHaveLength(1)
  })

  it('shows the most recently updated record when a year has the same band twice', () => {
    const [block] = summariseAcademicResults([
      row('a_level', 2024, 'A*', null, '30', '2025-01-01T00:00:00Z'),
      row('a_level', 2024, 'A*', null, '33', '2025-06-01T00:00:00Z'),
      row('a_level', 2024, 'A*', null, '31', '2025-03-01T00:00:00Z'),
    ], 'all')
    expect(block.rows[0].values).toEqual(['33%'])
  })

  it('puts the IB average point score in its own last column, as points', () => {
    const [block] = summariseAcademicResults([
      row('ib', 2024, null, null, '36.40'), row('ib', 2024, 'HL 7', null, '25'), row('ib', 2024, 'SL 7', null, '30'),
    ], 'all')
    expect(block.bands).toEqual(['HL 7', 'SL 7', 'Average points'])
    expect(block.rows[0].values).toEqual(['25%', '30%', '36.4'])
  })

  it('orders blocks GCSE, A Level, then the other exam types by name, and leaves out rows without a year', () => {
    const blocks = summariseAcademicResults([
      row('higher', 2023, 'A', null, '40'), row('ib', 2023, null, null, '35'), row('a_level', 2023, 'A*', null, '30'),
      row('btec', 2019, 'D*', 'D', '50'), row('gcse', 2023, '9', null, '20'), row('gcse', null, '9', null, '99'),
    ], 'all')
    expect(blocks.map(b => b.examType)).toEqual(['GCSE', 'A Level', 'BTEC', 'Higher', 'IB'])
    expect(blocks[0].rows).toEqual([{ year: 2023, values: ['20%'] }])
  })

  it('handles a school with only Scottish exam types', () => {
    const blocks = summariseAcademicResults([
      row('higher', 2023, 'A', 'C', '90'), row('higher', 2023, 'A', null, '40'), row('higher', 2023, 'A', 'B', '70'),
    ], 'latest3')
    expect(blocks).toEqual([{ code: 'higher', examType: 'Higher', bands: ['A', 'A–B', 'A–C'], rows: [{ year: 2023, values: ['40%', '70%', '90%'] }] }])
  })

  it('orders Pre-U words (Distinction first) and points (D1 before M1) by their lower end', () => {
    const [words] = summariseAcademicResults([
      row('pre_u', 2020, 'Distinction', 'Pass', '100'), row('pre_u', 2020, 'Distinction', null, '56'), row('pre_u', 2020, 'Distinction', 'Merit', '92'),
    ], 'all')
    expect(words.bands).toEqual(['Distinction', 'Distinction–Merit', 'Distinction–Pass'])
    const [points] = summariseAcademicResults([
      row('pre_u', 2020, 'D1', 'M2', '1'), row('pre_u', 2020, 'D1', 'D3', '2'), row('pre_u', 2020, 'D1', 'D2', '3'), row('pre_u', 2020, 'D1', null, '4'),
    ], 'all')
    expect(points.bands).toEqual(['D1', 'D1–D2', 'D1–D3', 'D1–M2'])
  })

  it('ranks IB higher and standard level grades best first', () => {
    const [block] = summariseAcademicResults([
      row('ib', 2020, 'SL 7', null, '1'), row('ib', 2020, 'HL 3', null, '2'), row('ib', 2020, 'HL 7', null, '3'),
      row('ib', 2020, 'HL 7', 'HL 5', '4'), row('ib', 2020, '7', null, '5'),
    ], 'all')
    expect(block.bands).toEqual(['7', 'HL 7', 'HL 7–HL 5', 'HL 3', 'SL 7'])
  })

  it('sorts grades that are not on a known scale after known ones, by name', () => {
    const [block] = summariseAcademicResults([
      row('btec', 2020, 'Band 10', null, '1'), row('btec', 2020, 'Band 2', null, '2'), row('btec', 2020, 'A', null, '3'),
    ], 'all')
    expect(block.bands).toEqual(['A', 'Band 2', 'Band 10'])
  })

  it('settles two records updated at the same moment by id, whatever order the query returned them in', () => {
    const first = { ...row('a_level', 2024, 'A*', null, '30', '2025-05-05'), id: 'b' }
    const second = { ...row('a_level', 2024, 'A*', null, '31', '2025-05-05'), id: 'a' }
    expect(summariseAcademicResults([first, second], 'all')[0].rows[0].values).toEqual(['30%'])
    expect(summariseAcademicResults([second, first], 'all')[0].rows[0].values).toEqual(['30%'])
  })

  it('keeps a record with a null updated_at but a later created_at against an older updated one', () => {
    const older = row('a_level', 2024, 'A*', null, '30', '2025-01-01')
    const created = { ...row('a_level', 2024, 'A*', null, '35', '2025-01-01'), updated_at: null, created_at: '2025-09-01' }
    expect(summariseAcademicResults([older, created], 'all')[0].rows[0].values).toEqual(['35%'])
    expect(summariseAcademicResults([created, older], 'all')[0].rows[0].values).toEqual(['35%'])
  })

  it('shows a dash for a band whose record has no value', () => {
    const [block] = summariseAcademicResults([row('gcse', 2022, '9', '4', null), row('gcse', 2022, '9', '7', '77')], 'all')
    expect(block.rows[0].values).toEqual(['77%', '—'])
  })

  it('gives "Overall" to a non-IB row without a band, after the real bands', () => {
    const [block] = summariseAcademicResults([row('gcse', 2022, null, null, '60'), row('gcse', 2022, '9', null, '20')], 'all')
    expect(block.bands).toEqual(['9', 'Overall'])
    expect(block.rows[0].values).toEqual(['20%', '60%'])
  })
})
