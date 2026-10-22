import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callsOf, makeSupabaseStub, used, type Recorded } from '../../queries/__tests__/supabase-stub'

const state = vi.hoisted(() => ({ client: null as unknown }))

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({})) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => state.client) }))
vi.mock('@/lib/permissions/guard', () => ({ assertAccess: vi.fn(async () => null) }))
vi.mock('@/lib/supabase/actions/record-attachments', () => ({ purgeOwnerStorage: vi.fn() }))

import { createStudent, updateStudent } from '../students'

const LIST_NAME = "ST. PAUL'S COLLEGE"

function setup(schoolOnList = true, lookupError: unknown = null) {
  const stub = makeSupabaseStub((rec: Recorded) => {
    if (rec.table === 'present_schools') return { data: schoolOnList ? { name: LIST_NAME } : null, error: lookupError }
    if (used(rec, 'like')) return { data: [{ student_code: 'S000041' }], error: null }
    if (used(rec, 'insert')) return { data: { id: 'student-new' }, error: null }
    return { data: null, error: null }
  })
  state.client = stub.supabase
  return stub.queries
}

const written = (queries: Recorded[], method: 'insert' | 'update') =>
  callsOf(queries.find((q) => q.table === 'students' && used(q, method))!, method)[0][0] as Record<string, unknown>

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('saving a student with a current school from the list', () => {
  it('stores the id and copies the list name, whatever name was posted', async () => {
    const queries = setup()
    expect(await updateStudent('s1', { present_school_id: 5, present_school: 'st pauls' })).toEqual({ success: true })
    expect(callsOf(queries[0], 'eq')).toEqual([['id', 5]])
    expect(written(queries, 'update')).toMatchObject({ present_school_id: 5, present_school: LIST_NAME })
  })

  it('does the same for a new student', async () => {
    const queries = setup()
    const result = await createStudent({ surname: 'Chan', first_name: 'Tai Man', present_school_id: 5, present_school: null })
    expect(result).toEqual({ success: true, data: { id: 'student-new' } })
    expect(written(queries, 'insert')).toMatchObject({ present_school_id: 5, present_school: LIST_NAME, student_code: 'S000042' })
  })

  it('refuses an id that is not on the list and writes nothing', async () => {
    const queries = setup(false)
    expect(await updateStudent('s1', { present_school_id: 999 })).toEqual({ success: false, error: 'Choose a school from the list' })
    expect(queries.some((q) => q.table === 'students')).toBe(false)
  })

  it('reports a failed lookup as a failed save, not as an unknown school', async () => {
    const queries = setup(true, { message: 'timeout' })
    expect(await updateStudent('s1', { present_school_id: 5 })).toEqual({ success: false, error: 'Failed to update student' })
    expect(queries.some((q) => q.table === 'students')).toBe(false)
  })

  it('drops an old link when only text is sent', async () => {
    const queries = setup()
    await updateStudent('s1', { present_school: 'Sha Tin College' })
    expect(written(queries, 'update')).toEqual({ present_school: 'Sha Tin College', present_school_id: null })
  })

  it('keeps text typed before the list existed when no school is chosen', async () => {
    const queries = setup()
    await updateStudent('s1', { present_school_id: null, present_school: 'Sha Tin College' })
    expect(queries.some((q) => q.table === 'present_schools')).toBe(false)
    expect(written(queries, 'update')).toMatchObject({ present_school_id: null, present_school: 'Sha Tin College' })
  })

  it('removes the school when the field is cleared', async () => {
    const queries = setup()
    await updateStudent('s1', { present_school_id: null, present_school: null })
    expect(written(queries, 'update')).toMatchObject({ present_school_id: null, present_school: null })
  })

  it('leaves the school alone on updates that do not send it', async () => {
    const queries = setup()
    await updateStudent('s1', { passport_number: 'K1234567' })
    expect(queries.some((q) => q.table === 'present_schools')).toBe(false)
    expect(written(queries, 'update')).toEqual({ passport_number: 'K1234567' })
  })
})
