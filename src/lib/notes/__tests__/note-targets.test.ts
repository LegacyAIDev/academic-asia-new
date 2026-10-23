import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MODULES } from '@/lib/permissions/modules'
import { NOTE_TARGETS, noteTarget } from '../note-targets'

const MIGRATION = readFileSync(
  join(process.cwd(), 'supabase/migrations/20261023193522_record_notes_and_school_note_authors.sql'),
  'utf8',
)
const tableSql = MIGRATION.slice(MIGRATION.indexOf('create table if not exists public.record_notes'), MIGRATION.indexOf('create index'))

describe('NOTE_TARGETS', () => {
  it('uses only parent columns that the record_notes table has', () => {
    for (const { column } of Object.values(NOTE_TARGETS)) {
      expect(tableSql).toMatch(new RegExp(`\\b${column}\\s+uuid references`))
    }
  })

  it('gives each kind of record its own column', () => {
    const columns = Object.values(NOTE_TARGETS).map(t => t.column)
    expect(new Set(columns).size).toBe(columns.length)
    expect(tableSql).toContain('num_nonnulls(student_id, application_id, exam_id) = 1')
  })

  it('guards student and application notes with Students and exam notes with Exams', () => {
    expect(NOTE_TARGETS.student.module).toBe(MODULES.STUDENTS)
    expect(NOTE_TARGETS.application.module).toBe(MODULES.STUDENTS)
    expect(NOTE_TARGETS.exam.module).toBe(MODULES.EXAMS)
  })
})

describe('noteTarget', () => {
  it('finds registered keys', () => {
    expect(noteTarget('exam')).toBe(NOTE_TARGETS.exam)
    expect(noteTarget('student')?.column).toBe('student_id')
  })

  it('finds nothing for unknown keys, inherited properties or non-strings', () => {
    for (const key of ['', 'school', 'constructor', '__proto__', 'toString', 'hasOwnProperty', undefined, null, 5, {}]) {
      expect(noteTarget(key)).toBeUndefined()
    }
  })
})
