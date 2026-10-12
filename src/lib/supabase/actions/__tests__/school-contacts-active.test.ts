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

import { getContactsForSchools, updateSchoolContact } from '../school-contacts'
import { getSchoolContactCount } from '../../queries/school-contacts'

type Result = { data: unknown; error: unknown; count?: number | null }

function setup(rights: string[], respond: (rec: Recorded) => Result) {
  state.rights = new Set(rights)
  const stub = makeSupabaseStub(respond)
  state.client = stub.supabase
  return stub
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('getSchoolContactCount', () => {
  it('counts only the active contacts of the given school', async () => {
    const { queries } = setup([], () => ({ data: null, error: null, count: 3 }))
    expect(await getSchoolContactCount('school-1')).toBe(3)
    expect(queries[0].table).toBe('school_contacts')
    expect(callsOf(queries[0], 'eq')).toEqual([['school_id', 'school-1'], ['is_active', true]])
  })

  it('returns 0 when the count fails', async () => {
    setup([], () => ({ data: null, error: { message: 'boom' } }))
    expect(await getSchoolContactCount('school-1')).toBe(0)
  })
})

describe('getContactsForSchools', () => {
  it('asks only for active contacts of the given schools', async () => {
    const { queries } = setup(['schools:1'], () => ({ data: [], error: null }))
    await getContactsForSchools(['s1', 's2'])
    expect(callsOf(queries[0], 'in')).toEqual([['school_id', ['s1', 's2']]])
    expect(callsOf(queries[0], 'eq')).toEqual([['is_active', true]])
  })

  it('does not query when there are no school ids', async () => {
    const { queries } = setup(['schools:1'], () => ({ data: [], error: null }))
    expect(await getContactsForSchools([])).toEqual([])
    expect(queries).toHaveLength(0)
  })

  it('returns nothing without Schools read access', async () => {
    const { queries } = setup([], () => ({ data: [{ id: 'c1' }], error: null }))
    expect(await getContactsForSchools(['s1'])).toEqual([])
    expect(queries).toHaveLength(0)
  })
})

describe('updateSchoolContact with is_active', () => {
  it('needs Schools write access', async () => {
    const { queries } = setup(['schools:1'], () => ({ data: null, error: null }))
    expect(await updateSchoolContact('c1', 's1', { is_active: false })).toEqual(DENIED)
    expect(queries).toHaveLength(0)
  })

  it('updates only the is_active field of that contact, and only within the given school', async () => {
    const { queries } = setup(['schools:1', 'schools:2'], () => ({ data: null, error: null }))
    expect(await updateSchoolContact('c1', 's1', { is_active: false })).toEqual({ success: true })
    expect(queries).toHaveLength(1)
    expect(used(queries[0], 'update')).toBe(true)
    expect(callsOf(queries[0], 'update')).toEqual([[{ is_active: false }]])
    expect(callsOf(queries[0], 'eq')).toEqual([['id', 'c1'], ['school_id', 's1']])
  })
})
