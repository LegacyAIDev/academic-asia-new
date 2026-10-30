import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callsOf, makeSupabaseStub } from '../../queries/__tests__/supabase-stub'

const state = vi.hoisted(() => ({ client: null as unknown, rights: new Set<string>() }))
const DENIED = { success: false, error: 'You do not have permission to perform this action.' }

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({})) }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => state.client) }))
vi.mock('@/lib/permissions/guard', () => ({
  assertAccess: vi.fn(async (module: string, level = 1) => (state.rights.has(`${module}:${level}`) ? null : DENIED)),
}))

import { searchEmailBodies } from '../filed-email-search'

const ID = '11111111-1111-4111-8111-111111111111'

function setup(rights: string[]) {
  state.rights = new Set(rights)
  const stub = makeSupabaseStub(() => ({ data: [{ id: 'e1' }, { id: 'e2' }], error: null }))
  state.client = stub.supabase
  return stub
}

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
afterEach(() => vi.restoreAllMocks())

describe('searchEmailBodies', () => {
  it('finds emails by every word of their full text, on the record searched', async () => {
    const stub = setup(['students:1'])
    expect(await searchEmailBodies({ kind: 'student', id: ID }, 'Boarding  house')).toEqual({ success: true, data: ['e1', 'e2'] })
    expect(callsOf(stub.queries[0], 'eq')).toEqual([['student_id', ID]])
    expect(callsOf(stub.queries[0], 'ilike')).toEqual([['body_text', '%boarding%'], ['body_text', '%house%']])
  })

  it('matches LIKE wildcards literally', async () => {
    const stub = setup(['schools:1'])
    await searchEmailBodies({ kind: 'school', id: ID }, '100%_sure')
    expect(callsOf(stub.queries[0], 'ilike')).toEqual([['body_text', '%100\\%\\_sure%']])
  })

  it('needs read access to the record\'s module and a real record id', async () => {
    let stub = setup(['students:1'])
    expect(await searchEmailBodies({ kind: 'school', id: ID }, 'x')).toEqual(DENIED)
    stub = setup(['students:1'])
    expect(await searchEmailBodies({ kind: 'application', id: 'nope' }, 'x')).toEqual({ success: false, error: 'Invalid search' })
    expect(stub.queries).toHaveLength(0)
  })
})
