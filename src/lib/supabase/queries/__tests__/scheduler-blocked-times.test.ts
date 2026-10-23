import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callsOf, makeSupabaseStub, type Recorded } from './supabase-stub'

const state = vi.hoisted(() => ({ client: null as unknown }))

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({})) }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => state.client) }))

import { getBlockedTimeOccurrences, listBlockedTimes } from '../scheduler-blocked-times'

const row = (n: number) => ({
  blocked_time_id: `b${n}`, label: 'Lunch', profile_id: 'p1', room_id: null,
  start_at: '2026-11-03T05:00:00.000Z', end_at: '2026-11-03T06:00:00.000Z',
})

type Page = { data: unknown[] | null; error: unknown }

/** Hands out the given pages in order; the rpc call is recorded as a pseudo table with its args. */
function setup(pages: Page[]) {
  let next = 0
  const stub = makeSupabaseStub(() => pages[next++] ?? { data: [], error: null })
  const rpcCalls: { name: string; args: unknown }[] = []
  state.client = Object.assign(stub.supabase, {
    rpc: (name: string, args: unknown) => {
      rpcCalls.push({ name, args })
      return (stub.supabase as unknown as { from: (t: string) => unknown }).from(`rpc:${name}`)
    },
  })
  return { queries: stub.queries, rpcCalls }
}

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
afterEach(() => vi.restoreAllMocks())

describe('getBlockedTimeOccurrences', () => {
  it('turns the inclusive Hong Kong dates into instants for the RPC', async () => {
    const { rpcCalls } = setup([{ data: [], error: null }])
    await getBlockedTimeOccurrences({ from: '2026-11-03', to: '2026-11-05', profileIds: ['p1'] })
    expect(rpcCalls).toEqual([{
      name: 'scheduler_blocked_time_occurrences',
      args: { p_from: '2026-11-02T16:00:00.000Z', p_to: '2026-11-05T16:00:00.000Z', p_profile_ids: ['p1'], p_room_ids: [] },
    }])
  })

  it('does not query without people or rooms', async () => {
    const { queries, rpcCalls } = setup([])
    expect(await getBlockedTimeOccurrences({ from: '2026-11-03', to: '2026-11-03' })).toEqual([])
    expect(rpcCalls).toHaveLength(0)
    expect(queries).toHaveLength(0)
  })

  it('stops after a short page and maps the rows', async () => {
    const { queries } = setup([{ data: [row(1), row(2)], error: null }])
    const result = await getBlockedTimeOccurrences({ from: '2026-11-03', to: '2026-11-03', roomIds: ['r1'] })
    expect(queries).toHaveLength(1)
    expect(callsOf(queries[0], 'range')).toEqual([[0, 999]])
    expect(result[0]).toEqual({
      blockedTimeId: 'b1', label: 'Lunch', profileId: 'p1', roomId: null,
      startAt: '2026-11-03T05:00:00.000Z', endAt: '2026-11-03T06:00:00.000Z',
    })
  })

  it('keeps reading while pages are full, then stops on the short one', async () => {
    const full = Array.from({ length: 1000 }, (_, i) => row(i))
    const { queries } = setup([{ data: full, error: null }, { data: [row(1000)], error: null }])
    const result = await getBlockedTimeOccurrences({ from: '2026-11-03', to: '2026-11-30', profileIds: ['p1'] })
    expect(result).toHaveLength(1001)
    expect(queries.map((q: Recorded) => callsOf(q, 'range')[0])).toEqual([[0, 999], [1000, 1999]])
  })

  it('returns an empty list when the database errors', async () => {
    setup([{ data: null, error: { message: 'boom' } }])
    expect(await getBlockedTimeOccurrences({ from: '2026-11-03', to: '2026-11-03', profileIds: ['p1'] })).toEqual([])
  })
})

describe('listBlockedTimes', () => {
  it('scopes to the person or to the rooms', async () => {
    const { queries } = setup([{ data: [], error: null }, { data: [], error: null }])
    await listBlockedTimes({ profileId: 'p1' })
    await listBlockedTimes({ roomIds: ['r1', 'r2'] })
    expect(callsOf(queries[0], 'eq')).toEqual([['profile_id', 'p1']])
    expect(callsOf(queries[1], 'in')).toEqual([['room_id', ['r1', 'r2']]])
  })

  it('skips the read for no rooms', async () => {
    const { queries } = setup([])
    expect(await listBlockedTimes({ roomIds: [] })).toEqual([])
    expect(queries).toHaveLength(0)
  })
})
