import { describe, it, expect, vi } from 'vitest'
import { callsOf, makeSupabaseStub } from '../../queries/__tests__/supabase-stub'

const state = vi.hoisted(() => ({ client: null as unknown, allowed: true }))
const DENIED = { success: false, error: 'You do not have permission to perform this action.' }

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({})) }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => state.client) }))
vi.mock('@/lib/permissions/guard', () => ({ assertAccess: vi.fn(async () => (state.allowed ? null : DENIED)) }))

import { loadStudentLegacyLog } from '../student-log-book'

const STUDENT = '11111111-1111-4111-8111-111111111111'

function setup(response: { data: unknown; error: unknown }, allowed = true) {
  state.allowed = allowed
  const stub = makeSupabaseStub(() => response)
  state.client = stub.supabase
  return stub.queries
}

describe('loadStudentLegacyLog', () => {
  it('returns the log text of the student', async () => {
    const queries = setup({ data: { remarks: 'Old entry' }, error: null })
    expect(await loadStudentLegacyLog(STUDENT)).toEqual({ success: true, data: { text: 'Old entry' } })
    expect(callsOf(queries[0], 'eq')).toEqual([['student_id', STUDENT]])
  })

  it('returns empty text when the student has no log book', async () => {
    setup({ data: null, error: null })
    expect(await loadStudentLegacyLog(STUDENT)).toEqual({ success: true, data: { text: '' } })
  })

  it('is refused without access and for ids that are not uuids, before any query', async () => {
    let queries = setup({ data: null, error: null }, false)
    expect(await loadStudentLegacyLog(STUDENT)).toEqual(DENIED)
    expect(queries).toHaveLength(0)
    queries = setup({ data: null, error: null })
    expect(await loadStudentLegacyLog('nope')).toEqual({ success: false, error: 'Student not found' })
    expect(queries).toHaveLength(0)
  })
})
