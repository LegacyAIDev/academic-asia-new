import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callsOf, makeSupabaseStub } from './supabase-stub'

const state = vi.hoisted(() => ({ client: null as unknown }))

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({})) }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => state.client) }))

import { getPresentSchoolName, getPresentSchools } from '../present-schools'

type Result = { data: unknown; error: unknown }

function setup(pages: Result[]) {
  let call = 0
  const stub = makeSupabaseStub(() => pages[call++] ?? { data: [], error: null })
  state.client = stub.supabase
  return stub.queries
}

const rows = (n: number, from = 0) =>
  Array.from({ length: n }, (_, i) => ({ id: from + i + 1, name: `SCHOOL ${from + i + 1}`, aliases: [] }))
const page = (n: number, from = 0): Result => ({ data: rows(n, from), error: null })

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('getPresentSchools', () => {
  it('reads past the 1,000-row cap, page by page, active schools by name', async () => {
    const queries = setup([page(1000), page(1000, 1000), page(5, 2000)])
    expect(await getPresentSchools()).toHaveLength(2005)
    expect(queries.map((q) => callsOf(q, 'range'))).toEqual([[[0, 999]], [[1000, 1999]], [[2000, 2999]]])
    expect(callsOf(queries[0], 'eq')).toEqual([['is_active', true]])
    expect(callsOf(queries[0], 'order')).toEqual([['name'], ['id']])
  })

  it('stops after a short page', async () => {
    const queries = setup([page(3)])
    expect(await getPresentSchools()).toEqual(rows(3))
    expect(queries).toHaveLength(1)
  })

  it('asks once more when a page is exactly full', async () => {
    const queries = setup([page(1000), { data: [], error: null }])
    expect(await getPresentSchools()).toHaveLength(1000)
    expect(queries).toHaveLength(2)
  })

  it('returns nothing rather than a cut-off list when a page fails', async () => {
    setup([page(1000), { data: null, error: { message: 'timeout' } }])
    expect(await getPresentSchools()).toEqual([])
  })
})

describe('getPresentSchoolName', () => {
  it('gives the list name of the school', async () => {
    const queries = setup([{ data: { name: "ST. PAUL'S COLLEGE" }, error: null }])
    expect(await getPresentSchoolName(5)).toBe("ST. PAUL'S COLLEGE")
    expect(callsOf(queries[0], 'eq')).toEqual([['id', 5]])
  })

  it('gives null for an unknown school', async () => {
    setup([{ data: null, error: null }])
    expect(await getPresentSchoolName(999)).toBeNull()
  })

  it('throws when the read fails, rather than calling the school unknown', async () => {
    setup([{ data: null, error: { message: 'timeout' } }])
    await expect(getPresentSchoolName(5)).rejects.toThrow('timeout')
  })
})
