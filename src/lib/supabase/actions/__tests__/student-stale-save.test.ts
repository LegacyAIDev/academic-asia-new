import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callsOf, makeSupabaseStub, used, type Recorded } from '../../queries/__tests__/supabase-stub'

const state = vi.hoisted(() => ({ client: null as unknown }))

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({})) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => state.client) }))
vi.mock('@/lib/permissions/guard', () => ({ assertAccess: vi.fn(async () => null) }))
vi.mock('@/lib/supabase/actions/record-attachments', () => ({ purgeOwnerStorage: vi.fn() }))

import { updateStudent } from '../students'

const OPENED_AT = '2026-11-10T03:12:45.123456+00:00'

/** The update matches a row only when the student is still as the editor saw it. */
function setup(stillCurrent: boolean) {
  const stub = makeSupabaseStub((rec: Recorded) =>
    used(rec, 'update') ? { data: stillCurrent ? [{ id: 's1' }] : [], error: null } : { data: null, error: null })
  state.client = stub.supabase
  return stub.queries
}

const studentUpdate = (queries: Recorded[]) => queries.find((q) => q.table === 'students' && used(q, 'update'))!

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('saving a student from an editor opened earlier (DEV24-002)', () => {
  it('saves when nobody changed the student in the meantime', async () => {
    const queries = setup(true)
    expect(await updateStudent('s1', { remarks: 'Prefers mornings' }, { expectedUpdatedAt: OPENED_AT })).toEqual({ success: true })
    expect(callsOf(studentUpdate(queries), 'eq')).toEqual([['id', 's1'], ['updated_at', OPENED_AT]])
  })

  it('refuses the save and asks for a reload when someone saved first', async () => {
    setup(false)
    const result = await updateStudent('s1', { remarks: 'Prefers mornings' }, { expectedUpdatedAt: OPENED_AT })
    expect(result).toMatchObject({ success: false, conflict: true })
    expect(result.error).toMatch(/not saved.*Reload/)
  })

  it('does not check when the caller has no opened version', async () => {
    const queries = setup(false)
    expect(await updateStudent('s1', { passport_number: 'K1234567' })).toEqual({ success: true })
    expect(callsOf(studentUpdate(queries), 'eq')).toEqual([['id', 's1']])
  })
})
