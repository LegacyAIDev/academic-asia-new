import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callsOf, makeSupabaseStub, used, type Recorded } from '../../queries/__tests__/supabase-stub'

const state = vi.hoisted(() => ({ client: null as unknown, rights: new Set<string>() }))
const DENIED = { success: false, error: 'You do not have permission to perform this action.' }

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({})) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => state.client) }))
vi.mock('@/lib/permissions/guard', () => ({
  assertAccess: vi.fn(async (module: string, level = 1) => (state.rights.has(`${module}:${level}`) ? null : DENIED)),
}))

import { addPresentSchool } from '../present-schools'

type Result = { data: unknown; error: unknown }

function setup(rights: string[], respond: (rec: Recorded, nth: number) => Result) {
  state.rights = new Set(rights)
  let nth = 0
  const stub = makeSupabaseStub((rec) => respond(rec, nth++))
  state.client = Object.assign(stub.supabase, {
    auth: { getUser: async () => ({ data: { user: { id: 'profile-1' } }, error: null }) },
  })
  return stub
}

const WRITE = ['students:2']

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('addPresentSchool', () => {
  it('needs Students write access', async () => {
    const { queries } = setup(['students:1'], () => ({ data: null, error: null }))
    expect(await addPresentSchool('Macau Anglican College')).toEqual(DENIED)
    expect(queries).toHaveLength(0)
  })

  it('refuses an empty or overlong name without querying', async () => {
    const { queries } = setup(WRITE, () => ({ data: null, error: null }))
    expect(await addPresentSchool(' ... ')).toEqual({ success: false, error: 'Enter the name of the school' })
    expect((await addPresentSchool('A'.repeat(201))).error).toBe('School names can be at most 200 characters')
    expect(queries).toHaveLength(0)
  })

  it('returns the school already on the list under any spelling instead of adding it again', async () => {
    const { queries } = setup(WRITE, () => ({ data: { id: 7, name: "ST. PAUL'S COLLEGE" }, error: null }))
    expect(await addPresentSchool('st paul’s college')).toEqual({
      success: true, data: { id: 7, name: "ST. PAUL'S COLLEGE", created: false },
    })
    expect(callsOf(queries[0], 'overlaps')).toEqual([['search_keys', ['ST PAULS COLLEGE']]])
    expect(queries.some((q) => used(q, 'insert'))).toBe(false)
  })

  it('adds a missing school in list style, marked as added by staff', async () => {
    const { queries } = setup(WRITE, (rec) => used(rec, 'insert')
      ? { data: { id: 1301, name: 'MACAU ANGLICAN COLLEGE' }, error: null }
      : { data: null, error: null })

    expect(await addPresentSchool('  Macau  Anglican College ')).toEqual({
      success: true, data: { id: 1301, name: 'MACAU ANGLICAN COLLEGE', created: true },
    })
    expect(callsOf(queries[1], 'insert')).toEqual([[{
      name: 'MACAU ANGLICAN COLLEGE',
      aliases: [],
      match_key: 'MACAU ANGLICAN COLLEGE',
      search_keys: ['MACAU ANGLICAN COLLEGE'],
      source: 'staff',
      created_by: 'profile-1',
    }]])
  })

  it('uses the school a colleague added a moment earlier when the insert collides', async () => {
    setup(WRITE, (rec, nth) => {
      if (used(rec, 'insert')) return { data: null, error: { code: '23505', message: 'duplicate key' } }
      return nth === 0 ? { data: null, error: null } : { data: { id: 1302, name: 'SHA TIN COLLEGE' }, error: null }
    })
    expect(await addPresentSchool('Sha Tin College')).toEqual({
      success: true, data: { id: 1302, name: 'SHA TIN COLLEGE', created: false },
    })
  })

  it('reports any other failure', async () => {
    setup(WRITE, (rec) => used(rec, 'insert')
      ? { data: null, error: { code: '42501', message: 'permission denied' } }
      : { data: null, error: null })
    expect(await addPresentSchool('Sha Tin College')).toEqual({ success: false, error: 'permission denied' })
  })

  it('does not insert when the lookup fails', async () => {
    const { queries } = setup(WRITE, () => ({ data: null, error: { message: 'timeout' } }))
    expect(await addPresentSchool('Sha Tin College')).toEqual({ success: false, error: 'timeout' })
    expect(queries.some((q) => used(q, 'insert'))).toBe(false)
  })

  it('answers with an error instead of throwing when the client fails', async () => {
    setup(WRITE, () => ({ data: null, error: null }))
    state.client = { from: () => { throw new Error('network down') } }
    expect(await addPresentSchool('Sha Tin College')).toEqual({ success: false, error: 'Failed to add the school' })
  })
})
