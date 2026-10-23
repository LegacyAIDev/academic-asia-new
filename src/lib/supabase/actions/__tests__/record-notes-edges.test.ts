import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callsOf, makeSupabaseStub } from '../../queries/__tests__/supabase-stub'

const state = vi.hoisted(() => ({ client: null as unknown, respond: null as null | (() => unknown) }))

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({})) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => state.client) }))
vi.mock('@/lib/permissions/guard', () => ({ assertAccess: vi.fn(async () => null) }))

import { revalidatePath } from 'next/cache'
import { addRecordNote, deleteRecordNote, listRecordNotes, updateRecordNote } from '../record-notes'

const RECORD = '11111111-1111-4111-8111-111111111111'
const NOTE = '22222222-2222-4222-8222-222222222222'
const row = (i: number) => ({
  id: `n${i}`, body: 'x', created_at: '2026-10-23T01:00:00Z', updated_at: '2026-10-23T01:00:00Z', author_id: 'me', author: null,
})

function setup(response: { data: unknown; error: unknown }) {
  const stub = makeSupabaseStub(() => response)
  state.client = Object.assign(stub.supabase, { auth: { getUser: async () => ({ data: { user: { id: 'me' } }, error: null }) } })
  return stub.queries
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.mocked(revalidatePath).mockClear()
})
afterEach(() => vi.restoreAllMocks())

describe('listRecordNotes cap', () => {
  it('has no "more" for exactly 200 rows', async () => {
    setup({ data: Array.from({ length: 200 }, (_, i) => row(i)), error: null })
    const result = await listRecordNotes('student', RECORD)
    expect(result.data?.notes).toHaveLength(200)
    expect(result.data?.more).toBe(false)
  })

  it('drops the oldest extra row, keeping the first 200 in order', async () => {
    setup({ data: Array.from({ length: 201 }, (_, i) => row(i)), error: null })
    const { notes } = (await listRecordNotes('exam', RECORD)).data!
    expect(notes[0].id).toBe('n0')
    expect(notes[199].id).toBe('n199')
  })

  it('treats null data as an empty list', async () => {
    setup({ data: null, error: null })
    expect(await listRecordNotes('student', RECORD)).toEqual({ success: true, data: { notes: [], more: false } })
  })

  it('reports a database error in plain words', async () => {
    setup({ data: null, error: { message: 'boom' } })
    expect(await listRecordNotes('student', RECORD)).toEqual({ success: false, error: 'Could not load the notes.' })
  })

  it('scopes application notes by application_id', async () => {
    const queries = setup({ data: [], error: null })
    await listRecordNotes('application', RECORD)
    expect(callsOf(queries[0], 'eq')).toEqual([['application_id', RECORD]])
  })
})

describe('update and delete scoping per target', () => {
  it.each([['student', 'student_id'], ['application', 'application_id'], ['exam', 'exam_id']])('%s narrows to %s', async (target, column) => {
    let queries = setup({ data: row(1), error: null })
    await updateRecordNote(target, NOTE, 'x')
    expect(callsOf(queries[0], 'not')).toEqual([[column, 'is', null]])
    queries = setup({ data: [{ id: NOTE }], error: null })
    await deleteRecordNote(target, NOTE)
    expect(callsOf(queries[0], 'not')).toEqual([[column, 'is', null]])
    expect(callsOf(queries[0], 'select')).toEqual([['id']])
  })

  it('refreshes after a successful change only', async () => {
    setup({ data: null, error: null })
    await updateRecordNote('exam', NOTE, 'x')
    expect(revalidatePath).not.toHaveBeenCalled()
    setup({ data: row(1), error: null })
    await updateRecordNote('exam', NOTE, 'x')
    expect(revalidatePath).toHaveBeenCalledWith('/exams')
  })

  it('reports database errors without refreshing', async () => {
    setup({ data: null, error: { message: 'boom' } })
    expect(await updateRecordNote('student', NOTE, 'x')).toEqual({ success: false, error: 'Could not save the note.' })
    expect(await deleteRecordNote('student', NOTE)).toEqual({ success: false, error: 'Could not delete the note.' })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('treats null delete data as nothing deleted', async () => {
    setup({ data: null, error: null })
    expect(await deleteRecordNote('student', NOTE)).toEqual({ success: false, error: 'You can only delete your own notes.' })
  })
})

describe('thrown errors', () => {
  it('are caught and reported in plain words', async () => {
    state.client = { from: () => { throw new Error('network') }, auth: { getUser: async () => ({ data: { user: { id: 'me' } } }) } }
    expect(await listRecordNotes('student', RECORD)).toEqual({ success: false, error: 'Could not load the notes.' })
    expect(await addRecordNote('student', RECORD, 'x')).toEqual({ success: false, error: 'Could not save the note.' })
    expect(await updateRecordNote('student', NOTE, 'x')).toEqual({ success: false, error: 'Could not save the note.' })
    expect(await deleteRecordNote('student', NOTE)).toEqual({ success: false, error: 'Could not delete the note.' })
  })
})
