import { describe, expect, it } from 'vitest'
import { checkRows, readCsv, resultKey, SAMPLE_CSV } from '../results-import'

const schools = [
  { id: 's-brighton', name: 'Brighton College' },
  { id: 's-sevenoaks', name: 'Sevenoaks School' },
  { id: 's-trinity-1', name: 'Trinity School' },
  { id: 's-trinity-2', name: 'Trinity School' },
]
const examTypes = [{ id: 1, code: 'a_level', label: 'A Level' }, { id: 2, code: 'gcse', label: 'GCSE' }, { id: 6, code: 'ib', label: 'IB' }]
const check = (csv: string) => checkRows(readCsv(csv).rows, schools, examTypes, 2026)

describe('importing schools\' exam results', () => {
  it('accepts the downloadable sample as it is', () => {
    const { rows, missing } = readCsv(SAMPLE_CSV)
    expect(missing).toEqual([])
    const { valid, problems } = checkRows(rows, schools, examTypes, 2026)
    expect(problems).toEqual([])
    expect(valid).toHaveLength(5)
    expect(valid[0]).toMatchObject({ school_id: 's-brighton', exam_year: 2025, exam_type_id: 2, grade_from: '9', grade_to: '7', result_percentage: 81.5 })
    expect(valid[4]).toMatchObject({ exam_type_code: 'ib', grade_from: null, grade_to: null, result_percentage: 38.6 })
  })

  it('reads loose headers, exam type spellings and grade cases', () => {
    const csv = 'School,Exam Year,Exam Type,Grade From,Grade To,Result %,Remarks\nbrighton college,2024,A-level,a*,a,61%,x\n'
    const { valid, problems } = check(csv)
    expect(problems).toEqual([])
    expect(valid[0]).toMatchObject({ exam_type_id: 1, grade_from: 'A*', grade_to: 'A', result_percentage: 61 })
  })

  it('names each problem with its line', () => {
    const csv = [
      'school,school_id,exam_year,exam_type,grade_from,grade_to,result_percent,remarks',
      'Nowhere School,,2025,GCSE,9,7,80,',
      'Trinity School,,2025,GCSE,9,7,80,',
      'Brighton College,,25,GCSE,9,7,80,',
      'Brighton College,,2025,O Level,9,7,80,',
      'Brighton College,,2025,GCSE,10,7,80,',
      'Brighton College,,2025,GCSE,9,7,180,',
      'Brighton College,,2025,GCSE,,,80,',
      'Sevenoaks School,,2025,IB,,,50,',
      'Brighton College,,2025,GCSE,9,7,80,',
      'Brighton College,,2025,GCSE,9,7,81,',
      ',s-trinity-2,2025,GCSE,9,7,70,',
    ].join('\n')
    const { valid, problems } = check(csv)
    expect(problems.map(p => p.line)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 11])
    expect(problems[1].message).toMatch(/2 schools are called "Trinity School"/)
    expect(problems[8].message).toMatch(/Repeats line 10/)
    expect(valid.map(v => v.line)).toEqual([10, 12])
    expect(valid[1].school_id).toBe('s-trinity-2')
  })

  it('reports missing columns and keys results by school, year, type and band', () => {
    expect(readCsv('school,exam_year\nx,2025\n').missing).toEqual(['exam_type', 'grade_from', 'result_percent'])
    expect(resultKey({ school_id: 's', exam_year: 2025, exam_type_id: 2, grade_from: '9', grade_to: null })).toBe('s|2025|2|9|')
  })
})
