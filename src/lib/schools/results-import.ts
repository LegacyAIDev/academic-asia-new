import Papa from 'papaparse'
import { GRADE_OPTIONS, IB_MAX_POINTS } from './result-grades'

/**
 * Bulk import of schools' published exam results (Schools → Exam results) from
 * a CSV: one row per school, exam year, exam type and grade band. A row whose
 * school, year, type and band already exist updates that result; any other row
 * is added.
 */

export const IMPORT_COLUMNS = ['school', 'school_id', 'exam_year', 'exam_type', 'grade_from', 'grade_to', 'result_percent', 'remarks'] as const

/** The sample offered for download: every column, and rows showing GCSE, A-level and IB. */
export const SAMPLE_CSV = [
  IMPORT_COLUMNS.join(','),
  'Brighton College,,2025,GCSE,9,7,81.5,Published August 2025',
  'Brighton College,,2025,GCSE,9,4,98.2,',
  'Brighton College,,2025,A Level,A*,A,62.4,',
  'Brighton College,,2025,A Level,A*,,24.1,A* only: leave grade_to empty',
  'Sevenoaks School,,2025,IB,,,38.6,IB average diploma points: leave both grades empty',
].join('\n') + '\n'

export const MAX_IMPORT_ROWS = 5000

export type SchoolRef = { id: string; name: string }
export type ExamTypeRef = { id: number; code: string; label: string }

export type ImportRow = {
  /** The CSV line, counting the header as line 1, for messages. */
  line: number
  school_id: string
  school_name: string
  exam_year: number
  exam_type_id: number
  exam_type_code: string
  grade_from: string | null
  grade_to: string | null
  result_percentage: number
  remarks: string | null
}

export type ImportProblem = { line: number; message: string }

/** "A-level", "A Level" and "a_level" are all the same exam type. */
const typeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')
const nameKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ')

/** The key that decides whether a row updates an existing result. */
export function resultKey(row: { school_id: string; exam_year: number | null; exam_type_id: number | null; grade_from: string | null; grade_to: string | null }): string {
  return [row.school_id, row.exam_year ?? '', row.exam_type_id ?? '', row.grade_from ?? '', row.grade_to ?? ''].join('|')
}

/** Reads a CSV into rows keyed by column name (headers matched loosely: "Result %" → result_percent). */
export function readCsv(text: string): { rows: Record<string, string>[]; missing: string[]; problem?: string } {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ''), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: header => {
      const key = header.trim().toLowerCase().replace(/%/g, ' percent').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
      return key === 'result_percentage' || key === 'result' ? 'result_percent' : key
    },
  })
  const fields = parsed.meta.fields ?? []
  const missing = ['exam_year', 'exam_type', 'grade_from', 'result_percent'].filter(col => !fields.includes(col))
  if (!fields.includes('school') && !fields.includes('school_id')) missing.unshift('school')
  if (parsed.data.length > MAX_IMPORT_ROWS) return { rows: [], missing, problem: `The file has ${parsed.data.length} rows; import at most ${MAX_IMPORT_ROWS} at a time.` }
  return { rows: parsed.data, missing }
}

/**
 * Checks every row and resolves its school and exam type. Each problem names
 * the CSV line, so it can be fixed in the file.
 */
export function checkRows(
  rows: Record<string, string>[],
  schools: SchoolRef[],
  examTypes: ExamTypeRef[],
  thisYear = new Date().getFullYear(),
): { valid: ImportRow[]; problems: ImportProblem[] } {
  const byId = new Map(schools.map(s => [s.id, s]))
  const byName = new Map<string, SchoolRef[]>()
  for (const school of schools) {
    const key = nameKey(school.name)
    byName.set(key, [...(byName.get(key) ?? []), school])
  }
  const types = new Map<string, ExamTypeRef>()
  for (const type of examTypes) { types.set(typeKey(type.code), type); types.set(typeKey(type.label), type) }

  const valid: ImportRow[] = []
  const problems: ImportProblem[] = []
  const seen = new Map<string, number>()

  rows.forEach((raw, index) => {
    const line = index + 2
    const cell = (key: string) => (raw[key] ?? '').trim()
    const fail = (message: string) => problems.push({ line, message })

    // School: by id when given, else by name.
    let school: SchoolRef | undefined
    const id = cell('school_id')
    const name = cell('school')
    if (id) {
      school = byId.get(id)
      if (!school) return fail(`No school has the id "${id}"`)
    } else if (name) {
      const matches = byName.get(nameKey(name)) ?? []
      if (matches.length === 0) return fail(`No school is called "${name}"`)
      if (matches.length > 1) return fail(`${matches.length} schools are called "${name}": add their school_id to choose one`)
      school = matches[0]
    } else {
      return fail('The school is missing')
    }

    const yearText = cell('exam_year')
    const year = Number(yearText)
    if (!/^\d{4}$/.test(yearText) || year < 1990 || year > thisYear + 1) return fail(`"${yearText || 'blank'}" is not an exam year`)

    const typeText = cell('exam_type')
    const type = types.get(typeKey(typeText))
    if (!type) return fail(`"${typeText || 'blank'}" is not an exam type (for example GCSE, A Level, IB)`)

    const options = GRADE_OPTIONS[type.code] ?? []
    const grade = (value: string) => options.find(option => option.toLowerCase() === value.toLowerCase()) ?? null
    const fromText = cell('grade_from')
    const toText = cell('grade_to')
    const from = fromText ? grade(fromText) : null
    const to = toText ? grade(toText) : null
    if (fromText && !from) return fail(`"${fromText}" is not a ${type.label} grade (${options.join(', ')})`)
    if (toText && !to) return fail(`"${toText}" is not a ${type.label} grade (${options.join(', ')})`)
    if (!from && to) return fail('grade_to is given without grade_from')
    const isIbPoints = type.code === 'ib' && !from
    if (!from && !isIbPoints) return fail('grade_from is missing')

    const percentText = cell('result_percent').replace(/%$/, '').trim()
    const percent = Number(percentText)
    const max = isIbPoints ? IB_MAX_POINTS : 100
    if (!percentText || !Number.isFinite(percent) || percent < 0 || percent > max) {
      return fail(isIbPoints ? `"${percentText || 'blank'}" is not an IB average (0 to ${IB_MAX_POINTS} points)` : `"${percentText || 'blank'}" is not a percentage (0 to 100)`)
    }

    const row: ImportRow = {
      line, school_id: school.id, school_name: school.name, exam_year: year, exam_type_id: type.id, exam_type_code: type.code,
      grade_from: from, grade_to: to, result_percentage: Math.round(percent * 100) / 100, remarks: cell('remarks').slice(0, 500) || null,
    }
    const key = resultKey(row)
    const earlier = seen.get(key)
    if (earlier) return fail(`Repeats line ${earlier} (same school, year, exam type and grades)`)
    seen.set(key, line)
    valid.push(row)
  })
  return { valid, problems }
}
