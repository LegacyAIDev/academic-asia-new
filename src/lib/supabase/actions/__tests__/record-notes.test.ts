import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callsOf, makeSupabaseStub } from '../../queries/__tests__/supabase-stub'

const state = vi.hoisted(() => ({ client: null as unknown, rights: new Set<string>() }))
const DENIED = { success: false, error: 'You do not have permission to perform this action.' }

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({})) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => state.client) }))
vi.mock('@/lib/permissions/guard', () => ({
  assertAccess: vi.fn(async (module: string, level = 1) => (state.rights.has(`${module}:${level}`) ? null : DENIED)),
}))

import { revalidatePath } from 'next/cache'
import { addRecordNote, deleteRecordNote, listRecordNotes, updateRecordNote } from '../record-notes'

const RECORD = '11111111-1111-4111-8111-111111111111'
const NOTE = '22222222-2222-4222-8222-222222222222'
const row = {
  id: NOTE, body: 'Called the parents', created_at: '2026-10-23T01:00:00Z', updated_at: '2026-10-23T01:00:00Z',
  author_id: 'me', author: { first_name: 'Olivia', surname: 'Wong' },
}
const saved = { id: NOTE, body: 'Called the parents', createdAt: row.created_at, updatedAt: row.updated_at, authorId: 'me', authorName: 'Olivia Wong' }

type Result = { data: unknown; error: unknown }

function setup(response: Result = { data: row, error: null }, rights = ['students:1', 'students:2', 'exams:1', 'exams:2'], user: string | null = 'me') {
  state.rights = new Set(rights)
  const stub = makeSupabaseStub(() => response)
  state.client = Object.assign(stub.supabase, {
    auth: { getUser: async () => ({ data: { user: user ? { id: user } : null }, error: null }) },
  })
  return stub.queries
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.mocked(revalidatePath).mockClear()
})
afterEach(() => vi.restoreAllMocks())

describe('addRecordNote', () => {
  it('files the note under the target column and never sends an author', async () => {
    const queries = setup()
    expect(await addRecordNote('application', RECORD, '  Called the parents ')).toEqual({ success: true, data: saved })
    const [insert] = callsOf(queries[0], 'insert')[0] as [Record<string, unknown>]
    expect(insert).toEqual({ application_id: RECORD, body: 'Called the parents' })
    expect(insert).not.toHaveProperty('author_id')
  })

  it('needs Students write for student and application notes, Exams write for exam notes', async () => {
    let queries = setup(undefined, ['students:2'])
    expect(await addRecordNote('exam', RECORD, 'x')).toEqual(DENIED)
    expect(queries).toHaveLength(0)
    queries = setup(undefined, ['exams:2'])
    expect(await addRecordNote('student', RECORD, 'x')).toEqual(DENIED)
    expect(await addRecordNote('application', RECORD, 'x')).toEqual(DENIED)
    expect(queries).toHaveLength(0)
    queries = setup(undefined, ['exams:2'])
    expect((await addRecordNote('exam', RECORD, 'x')).success).toBe(true)
    expect(callsOf(queries[0], 'insert')[0][0]).toMatchObject({ exam_id: RECORD })
  })

  it('refuses read-only users', async () => {
    setup(undefined, ['students:1'])
    expect(await addRecordNote('student', RECORD, 'x')).toEqual(DENIED)
  })

  it('refuses unknown targets, including inherited property names, before any query', async () => {
    const queries = setup()
    for (const key of ['school', 'constructor', '__proto__']) {
      expect(await addRecordNote(key, RECORD, 'x')).toEqual({ success: false, error: 'Unknown kind of record' })
    }
    expect(queries).toHaveLength(0)
  })

  it('rejects a bad id and a bad body without querying', async () => {
    const queries = setup()
    expect(await addRecordNote('student', 'nope', 'x')).toEqual({ success: false, error: 'Record not found' })
    expect(await addRecordNote('student', RECORD, '   ')).toEqual({ success: false, error: 'Write a note first' })
    expect(await addRecordNote('student', RECORD, 'a'.repeat(5001))).toMatchObject({ success: false })
    expect(queries).toHaveLength(0)
  })

  it('reports a database failure in plain words', async () => {
    setup({ data: null, error: { message: 'boom', code: '42501' } })
    expect(await addRecordNote('student', RECORD, 'x')).toEqual({ success: false, error: 'Could not save the note.' })
  })

  it('refreshes the pages that show the notes', async () => {
    setup()
    await addRecordNote('student', RECORD, 'x')
    await addRecordNote('application', RECORD, 'x')
    await addRecordNote('exam', RECORD, 'x')
    expect(vi.mocked(revalidatePath).mock.calls).toEqual([
      ['/students/[id]', 'page'],
      ['/students/[id]/applications/[applicationId]', 'page'],
      ['/exams'],
    ])
  })
})

describe('updateRecordNote', () => {
  it('limits the change to the signed-in author and to notes of that target', async () => {
    const queries = setup()
    expect(await updateRecordNote('student', NOTE, ' New text ')).toEqual({ success: true, data: saved })
    expect(callsOf(queries[0], 'update')[0]).toEqual([{ body: 'New text' }])
    expect(callsOf(queries[0], 'eq')).toEqual([['id', NOTE], ['author_id', 'me']])
    expect(callsOf(queries[0], 'not')).toEqual([['student_id', 'is', null]])
  })

  it('says "You can only edit your own notes." when no row matched', async () => {
    setup({ data: null, error: null })
    expect(await updateRecordNote('student', NOTE, 'x')).toEqual({ success: false, error: 'You can only edit your own notes.' })
  })

  it('guards by the target module, validates the id and the body', async () => {
    let queries = setup(undefined, ['students:2'])
    expect(await updateRecordNote('exam', NOTE, 'x')).toEqual(DENIED)
    expect(await updateRecordNote('student', 'nope', 'x')).toEqual({ success: false, error: 'Note not found' })
    expect(await updateRecordNote('student', NOTE, '')).toEqual({ success: false, error: 'Write a note first' })
    expect(queries).toHaveLength(0)
    queries = setup(undefined, undefined, null)
    expect(await updateRecordNote('student', NOTE, 'x')).toEqual({ success: false, error: 'Please sign in again.' })
    expect(queries).toHaveLength(0)
  })
})

describe('deleteRecordNote', () => {
  it('limits the delete to the signed-in author', async () => {
    const queries = setup({ data: [{ id: NOTE }], error: null })
    expect(await deleteRecordNote('exam', NOTE)).toEqual({ success: true })
    expect(callsOf(queries[0], 'delete')).toHaveLength(1)
    expect(callsOf(queries[0], 'eq')).toEqual([['id', NOTE], ['author_id', 'me']])
    expect(callsOf(queries[0], 'not')).toEqual([['exam_id', 'is', null]])
  })

  it('says "You can only delete your own notes." when nothing was deleted', async () => {
    setup({ data: [], error: null })
    expect(await deleteRecordNote('student', NOTE)).toEqual({ success: false, error: 'You can only delete your own notes.' })
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled()
  })

  it('guards, validates and handles a lost session without querying', async () => {
    let queries = setup(undefined, ['students:1'])
    expect(await deleteRecordNote('student', NOTE)).toEqual(DENIED)
    expect(await deleteRecordNote('nope', NOTE)).toEqual({ success: false, error: 'Unknown kind of record' })
    expect(queries).toHaveLength(0)
    queries = setup(undefined, undefined, null)
    expect(await deleteRecordNote('student', 'nope')).toEqual({ success: false, error: 'Note not found' })
    expect(await deleteRecordNote('student', NOTE)).toEqual({ success: false, error: 'Please sign in again.' })
    expect(queries).toHaveLength(0)
  })
})

describe('listRecordNotes', () => {
  it('needs read access to the target module and returns newest first, capped', async () => {
    const queries = setup({ data: [row], error: null }, ['exams:1'])
    expect(await listRecordNotes('student', RECORD)).toEqual(DENIED)
    expect(await listRecordNotes('exam', RECORD)).toEqual({ success: true, data: { notes: [saved], more: false } })
    expect(callsOf(queries[0], 'eq')).toEqual([['exam_id', RECORD]])
    expect(callsOf(queries[0], 'order')).toEqual([['created_at', { ascending: false }]])
    expect(callsOf(queries[0], 'limit')).toEqual([[201]])
  })

  it('flags more notes when the extra row came back', async () => {
    setup({ data: Array.from({ length: 201 }, (_, i) => ({ ...row, id: `n${i}` })), error: null })
    const result = await listRecordNotes('student', RECORD)
    expect(result.data?.notes).toHaveLength(200)
    expect(result.data?.more).toBe(true)
  })

  it('rejects a bad record id', async () => {
    const queries = setup()
    expect(await listRecordNotes('student', 'nope')).toEqual({ success: false, error: 'Record not found' })
    expect(queries).toHaveLength(0)
  })
})
