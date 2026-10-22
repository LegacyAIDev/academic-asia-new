import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callsOf, makeSupabaseStub, used, type Recorded } from '../../queries/__tests__/supabase-stub'

const state = vi.hoisted(() => ({ client: null as unknown, rights: new Set<string>() }))
const DENIED = { success: false, error: 'You do not have permission to perform this action.' }

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({})) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
import { revalidatePath } from 'next/cache'
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => state.client) }))
vi.mock('@/lib/permissions/guard', () => ({
  assertAccess: vi.fn(async (module: string, level = 1) => (state.rights.has(`${module}:${level}`) ? null : DENIED)),
}))

import { createPresentSchool, updatePresentSchool } from '../present-schools'

type Result = { data: unknown; error: unknown }
type Responses = { clash?: Result; write?: Result; sync?: Result }

/** Answers the lookup, the write to present_schools and the student sync separately. */
function setup(responses: Responses = {}, rights = ['students:2']) {
  state.rights = new Set(rights)
  const stub = makeSupabaseStub((rec: Recorded) => {
    if (rec.table === 'students') return responses.sync ?? { data: null, error: null }
    if (used(rec, 'insert') || used(rec, 'update')) return responses.write ?? { data: { id: 5, name: 'X' }, error: null }
    return responses.clash ?? { data: null, error: null }
  })
  state.client = Object.assign(stub.supabase, {
    auth: { getUser: async () => ({ data: { user: { id: 'profile-1' } }, error: null }) },
  })
  return stub.queries
}

const input = { name: ' Macau Anglican College ', aliases: ['mac', '', 'M.A.C.'] }

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.mocked(revalidatePath).mockClear()
})

const revalidated = () => vi.mocked(revalidatePath).mock.calls.map(([path]) => path)

describe('createPresentSchool', () => {
  it('needs Students write access', async () => {
    const queries = setup({}, ['students:1'])
    expect(await createPresentSchool(input)).toEqual(DENIED)
    expect(queries).toHaveLength(0)
  })

  it('refuses an empty name or an overlong spelling without querying', async () => {
    const queries = setup()
    expect(await createPresentSchool({ name: ' - ', aliases: [] })).toEqual({ success: false, error: 'Enter the name of the school' })
    expect((await createPresentSchool({ name: 'A', aliases: ['B'.repeat(201)] })).error).toBe('School names can be at most 200 characters')
    expect(queries).toHaveLength(0)
  })

  it('refuses a school that another school already answers to by any spelling', async () => {
    const queries = setup({ clash: { data: { id: 3, name: 'MACAU ANGLICAN COLLEGE' }, error: null } })
    expect(await createPresentSchool(input)).toEqual({ success: false, error: 'Already on the list as MACAU ANGLICAN COLLEGE' })
    expect(callsOf(queries[0], 'overlaps')).toEqual([['search_keys', ['MACAU ANGLICAN COLLEGE', 'MAC']]])
    expect(queries.some((q) => used(q, 'insert'))).toBe(false)
  })

  it('saves the name and spellings in list style, marked as added by staff', async () => {
    const queries = setup({ write: { data: { id: 1301, name: 'MACAU ANGLICAN COLLEGE' }, error: null } })
    expect(await createPresentSchool(input)).toEqual({ success: true, data: { id: 1301 } })
    expect(callsOf(queries[1], 'insert')).toEqual([[{
      name: 'MACAU ANGLICAN COLLEGE',
      aliases: ['MAC'],
      match_key: 'MACAU ANGLICAN COLLEGE',
      search_keys: ['MACAU ANGLICAN COLLEGE', 'MAC'],
      source: 'staff',
      created_by: 'profile-1',
    }]])
  })

  it('reports a duplicate that slipped in at the same moment', async () => {
    setup({ write: { data: null, error: { code: '23505', message: 'duplicate key' } } })
    expect(await createPresentSchool(input)).toEqual({ success: false, error: 'This school is already on the list' })
  })

  it('caps the other spellings and ignores anything that is not text', async () => {
    const queries = setup()
    const many = Array.from({ length: 21 }, (_, i) => `SPELLING ${i}`)
    expect((await createPresentSchool({ name: 'A', aliases: many })).error).toBe('A school can have at most 20 other spellings')
    expect(await createPresentSchool({ name: 42, aliases: null } as never)).toEqual({ success: false, error: 'Enter the name of the school' })
    expect(queries).toHaveLength(0)

    await createPresentSchool({ name: 'Macau Anglican College', aliases: [1, 'mac'] } as never)
    expect(callsOf(queries[1], 'insert')[0][0]).toMatchObject({ aliases: ['MAC'] })
  })

  it('reports a failed lookup or write without saving, and refreshes the pages only on success', async () => {
    let queries = setup({ clash: { data: null, error: { message: 'timeout' } } })
    expect(await createPresentSchool(input)).toEqual({ success: false, error: 'timeout' })
    expect(queries.some((q) => used(q, 'insert'))).toBe(false)

    setup({ write: { data: null, error: { code: '42501', message: 'permission denied' } } })
    expect(await createPresentSchool(input)).toEqual({ success: false, error: 'permission denied' })
    expect(revalidated()).toEqual([])

    queries = setup({ write: { data: { id: 1301 }, error: null } })
    await createPresentSchool(input)
    expect(revalidated()).toEqual(['/students', '/students/present-schools'])
  })
})

describe('updatePresentSchool', () => {
  it('needs Students write access and a real id', async () => {
    let queries = setup({}, ['students:1'])
    expect(await updatePresentSchool(5, input)).toEqual(DENIED)
    queries = setup()
    expect(await updatePresentSchool(Number.NaN, input)).toEqual({ success: false, error: 'School not found' })
    expect(queries).toHaveLength(0)
  })

  it('validates the new name like a new school', async () => {
    const queries = setup()
    expect(await updatePresentSchool(5, { name: ' - ', aliases: [] })).toEqual({ success: false, error: 'Enter the name of the school' })
    expect((await updatePresentSchool(5, { name: 'A'.repeat(201), aliases: [] })).error).toBe('School names can be at most 200 characters')
    expect(await updatePresentSchool(1.5, input)).toEqual({ success: false, error: 'School not found' })
    expect(queries).toHaveLength(0)
  })

  it('lets a school keep its own spellings but not take another school\'s', async () => {
    const queries = setup({ clash: { data: { id: 9, name: 'MACAU ANGLICAN COLLEGE (PRIMARY)' }, error: null } })
    expect(await updatePresentSchool(5, input)).toEqual({ success: false, error: 'Already on the list as MACAU ANGLICAN COLLEGE (PRIMARY)' })
    expect(callsOf(queries[0], 'neq')).toEqual([['id', 5]])
    expect(queries.some((q) => used(q, 'update'))).toBe(false)
  })

  it('replaces the name and spellings, then gives linked students the new name', async () => {
    const queries = setup()
    expect(await updatePresentSchool(5, input)).toEqual({ success: true })

    expect(callsOf(queries[1], 'update')).toEqual([[{
      name: 'MACAU ANGLICAN COLLEGE',
      aliases: ['MAC'],
      match_key: 'MACAU ANGLICAN COLLEGE',
      search_keys: ['MACAU ANGLICAN COLLEGE', 'MAC'],
    }]])
    expect(callsOf(queries[1], 'eq')).toEqual([['id', 5]])

    expect(queries[2].table).toBe('students')
    expect(callsOf(queries[2], 'update')).toEqual([[{ present_school: 'MACAU ANGLICAN COLLEGE' }]])
    expect(callsOf(queries[2], 'eq')).toEqual([['present_school_id', 5]])
    expect(callsOf(queries[2], 'neq')).toEqual([['present_school', 'MACAU ANGLICAN COLLEGE']])
  })

  it('says so when the school is gone and touches no student', async () => {
    const queries = setup({ write: { data: null, error: null } })
    expect(await updatePresentSchool(5, input)).toEqual({ success: false, error: 'School not found' })
    expect(queries.some((q) => q.table === 'students')).toBe(false)
  })

  it('asks to save again when the students could not be updated, and still refreshes the pages', async () => {
    setup({ sync: { data: null, error: { message: 'timeout' } } })
    expect((await updatePresentSchool(5, input)).error)
      .toBe('School saved, but some of its students still show the old name. Save it again to update them.')
    expect(revalidated()).toEqual(['/students', '/students/present-schools'])
  })

  it('reports a failed lookup or write without touching students', async () => {
    let queries = setup({ clash: { data: null, error: { message: 'timeout' } } })
    expect(await updatePresentSchool(5, input)).toEqual({ success: false, error: 'timeout' })
    expect(queries.some((q) => used(q, 'update'))).toBe(false)

    queries = setup({ write: { data: null, error: { code: '42501', message: 'permission denied' } } })
    expect(await updatePresentSchool(5, input)).toEqual({ success: false, error: 'permission denied' })
    expect(queries.some((q) => q.table === 'students')).toBe(false)
  })

  it('reports a name another school took at the same moment', async () => {
    setup({ write: { data: null, error: { code: '23505', message: 'duplicate key' } } })
    expect(await updatePresentSchool(5, input)).toEqual({ success: false, error: 'This school is already on the list' })
  })
})
