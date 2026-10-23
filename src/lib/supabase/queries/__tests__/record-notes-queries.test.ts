import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callsOf, makeSupabaseStub } from './supabase-stub'

const state = vi.hoisted(() => ({ client: null as unknown }))

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({})) }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => state.client) }))

import { getRecordNotes } from '../record-notes'
import { getStudentLegacyLogMeta } from '../student-log-book'
import { getSchoolNotes } from '../school-notes'

function setup(result: { data: unknown; error: unknown }) {
  const stub = makeSupabaseStub(() => result)
  state.client = stub.supabase
  return stub.queries
}
const row = (i: number) => ({
  id: `n${i}`, body: 'x', created_at: 'a', updated_at: 'b', author_id: null, author: null,
})

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
afterEach(() => vi.restoreAllMocks())

describe('getRecordNotes', () => {
  it('returns nothing, without querying, for unknown targets', async () => {
    const queries = setup({ data: [row(1)], error: null })
    for (const key of ['school', '__proto__', 'constructor', '']) {
      expect(await getRecordNotes(key, 'id')).toEqual({ notes: [], more: false })
    }
    expect(queries).toHaveLength(0)
  })

  it('asks for 201 newest rows by the target column and caps at 200', async () => {
    const queries = setup({ data: Array.from({ length: 201 }, (_, i) => row(i)), error: null })
    const page = await getRecordNotes('exam', 'e1')
    expect(page.notes).toHaveLength(200)
    expect(page.more).toBe(true)
    expect(callsOf(queries[0], 'eq')).toEqual([['exam_id', 'e1']])
    expect(callsOf(queries[0], 'order')).toEqual([['created_at', { ascending: false }]])
    expect(callsOf(queries[0], 'limit')).toEqual([[201]])
  })

  it('has no "more" at exactly 200 and maps former staff to null names', async () => {
    setup({ data: Array.from({ length: 200 }, (_, i) => row(i)), error: null })
    const page = await getRecordNotes('student', 's1')
    expect(page.more).toBe(false)
    expect(page.notes[0]).toMatchObject({ authorId: null, authorName: null })
  })

  it('is empty on a database error or null data', async () => {
    setup({ data: null, error: { message: 'boom' } })
    expect(await getRecordNotes('student', 's1')).toEqual({ notes: [], more: false })
    setup({ data: null, error: null })
    expect(await getRecordNotes('student', 's1')).toEqual({ notes: [], more: false })
  })
})

describe('getStudentLegacyLogMeta', () => {
  it('never selects the log text', async () => {
    const queries = setup({ data: { id: 'l1', legacy_last_update: null }, error: null })
    expect(await getStudentLegacyLogMeta('s1')).toEqual({ id: 'l1', legacy_last_update: null })
    const [columns] = callsOf(queries[0], 'select')[0] as [string]
    expect(columns).not.toContain('remarks')
    expect(columns).not.toContain('*')
    expect(callsOf(queries[0], 'eq')).toEqual([['student_id', 's1']])
  })

  it('is null when there is no log book or the query fails', async () => {
    setup({ data: null, error: null })
    expect(await getStudentLegacyLogMeta('s1')).toBeNull()
    setup({ data: null, error: { message: 'boom' } })
    expect(await getStudentLegacyLogMeta('s1')).toBeNull()
  })
})

describe('getSchoolNotes', () => {
  it('reads the author columns and joins the author profile', async () => {
    const queries = setup({ data: [], error: null })
    await getSchoolNotes('sc1')
    const [columns] = callsOf(queries[0], 'select')[0] as [string]
    expect(columns).toContain('created_by')
    expect(columns).toContain('legacy_last_update')
    expect(columns).toContain('profiles!school_notes_created_by_fkey(first_name, surname)')
    expect(callsOf(queries[0], 'eq')).toEqual([['school_id', 'sc1']])
  })

  it('is empty on error', async () => {
    setup({ data: null, error: { message: 'boom' } })
    expect(await getSchoolNotes('sc1')).toEqual([])
  })
})
