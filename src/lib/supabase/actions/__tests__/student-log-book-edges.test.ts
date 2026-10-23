import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callsOf, makeSupabaseStub } from '../../queries/__tests__/supabase-stub'

const state = vi.hoisted(() => ({ client: null as unknown }))

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({})) }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => state.client) }))
vi.mock('@/lib/permissions/guard', () => ({ assertAccess: vi.fn(async () => null) }))

import { assertAccess } from '@/lib/permissions/guard'
import { loadStudentLegacyLog } from '../student-log-book'

const STUDENT = '11111111-1111-4111-8111-111111111111'

function setup(response: { data: unknown; error: unknown }) {
  const stub = makeSupabaseStub(() => response)
  state.client = stub.supabase
  return stub.queries
}

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
afterEach(() => vi.restoreAllMocks())

describe('loadStudentLegacyLog edges', () => {
  it('asks for Students read access and selects only the remarks', async () => {
    const queries = setup({ data: { remarks: 'x' }, error: null })
    await loadStudentLegacyLog(STUDENT)
    expect(assertAccess).toHaveBeenCalledWith('students', 1)
    expect(callsOf(queries[0], 'select')).toEqual([['remarks']])
    expect(queries[0].table).toBe('student_log_book')
  })

  it('returns empty text when the row exists with null remarks', async () => {
    setup({ data: { remarks: null }, error: null })
    expect(await loadStudentLegacyLog(STUDENT)).toEqual({ success: true, data: { text: '' } })
  })

  it('rejects empty, padded and injection-shaped ids before querying', async () => {
    const queries = setup({ data: null, error: null })
    for (const id of ['', ` ${STUDENT}`, `${STUDENT},student_id.neq.x`, '1', 'null']) {
      expect(await loadStudentLegacyLog(id)).toEqual({ success: false, error: 'Student not found' })
    }
    expect(queries).toHaveLength(0)
  })

  it('reports database errors and thrown errors in plain words', async () => {
    setup({ data: null, error: { message: 'boom' } })
    expect(await loadStudentLegacyLog(STUDENT)).toEqual({ success: false, error: 'Could not load the old log book.' })
    state.client = { from: () => { throw new Error('network') } }
    expect(await loadStudentLegacyLog(STUDENT)).toEqual({ success: false, error: 'Could not load the old log book.' })
  })
})
