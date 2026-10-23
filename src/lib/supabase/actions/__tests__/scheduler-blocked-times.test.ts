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
vi.mock('@/lib/supabase/queries/scheduler-blocked-times', () => ({
  getBlockedTimeOccurrences: vi.fn(async () => []),
  getRoomItemsInRange: vi.fn(async () => []),
}))

import { createBlockedTime, deleteBlockedTime, updateBlockedTime } from '../scheduler-blocked-times'

const ROOM = '11111111-1111-4111-8111-111111111111'
const BLOCK = '22222222-2222-4222-8222-222222222222'
const input = { label: 'Lunch', preset: 'weekdays' as const, start_time: '13:00', end_time: '14:00', starts_on: '2026-11-03' }

type Result = { data: unknown; error: unknown }

function setup(response: Result = { data: [{ id: BLOCK }], error: null }, rights = ['scheduler:2', 'exams:2'], user: string | null = 'me') {
  state.rights = new Set(rights)
  const stub = makeSupabaseStub(() => response)
  state.client = Object.assign(stub.supabase, {
    auth: { getUser: async () => ({ data: { user: user ? { id: user } : null }, error: null }) },
  })
  return stub.queries
}
const single = { data: { id: BLOCK }, error: null }

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
afterEach(() => vi.restoreAllMocks())

describe('createBlockedTime', () => {
  it('stamps a profile block with the signed-in user, never client input', async () => {
    const queries = setup(single)
    const forged = { kind: 'profile', profileId: 'someone-else', profile_id: 'someone-else' } as never
    expect(await createBlockedTime(forged, { ...input, profile_id: 'someone-else' } as never)).toEqual({ success: true, data: { id: BLOCK, clashes: [] } })
    const [row] = callsOf(queries[0], 'insert')[0] as [Record<string, unknown>]
    expect(row.profile_id).toBe('me')
    expect(row).not.toHaveProperty('room_id')
  })

  it('needs Scheduler write for a profile block and Exams write for a room block', async () => {
    let queries = setup(single, ['exams:2'])
    expect(await createBlockedTime({ kind: 'profile' }, input)).toEqual(DENIED)
    expect(queries).toHaveLength(0)
    queries = setup(single, ['scheduler:2'])
    expect(await createBlockedTime({ kind: 'room', roomId: ROOM }, input)).toEqual(DENIED)
    expect(queries).toHaveLength(0)
    queries = setup(single, ['exams:2'])
    expect((await createBlockedTime({ kind: 'room', roomId: ROOM }, input)).success).toBe(true)
    expect((callsOf(queries[0], 'insert')[0][0] as Record<string, unknown>).room_id).toBe(ROOM)
  })

  it('rejects a room id that is not a uuid, and surfaces the first schema message', async () => {
    const queries = setup(single)
    expect(await createBlockedTime({ kind: 'room', roomId: 'nope' }, input)).toEqual({ success: false, error: 'Invalid room' })
    expect(await createBlockedTime({ kind: 'profile' }, { ...input, label: ' ', end_time: '12:00' })).toEqual({ success: false, error: 'Give the block a name' })
    expect(queries).toHaveLength(0)
  })

  it('asks to sign in again when the session is gone', async () => {
    const queries = setup(single, ['scheduler:2'], null)
    expect(await createBlockedTime({ kind: 'profile' }, input)).toEqual({ success: false, error: 'Please sign in again.' })
    expect(queries).toHaveLength(0)
  })
})

describe('updateBlockedTime and deleteBlockedTime', () => {
  it('say "Blocked time not found" for an id that is not a uuid, without querying', async () => {
    const queries = setup()
    const missing = { success: false, error: 'Blocked time not found' }
    expect(await updateBlockedTime('nope', { kind: 'profile' }, input)).toEqual(missing)
    expect(await deleteBlockedTime('nope', { kind: 'profile' })).toEqual(missing)
    expect(queries).toHaveLength(0)
  })

  it('limits a profile update to the signed-in user, and a delete likewise', async () => {
    const queries = setup()
    expect(await updateBlockedTime(BLOCK, { kind: 'profile' }, input)).toEqual({ success: true, data: { id: BLOCK, clashes: [] } })
    expect(callsOf(queries[0], 'eq')).toEqual([['id', BLOCK], ['profile_id', 'me']])
    expect(await deleteBlockedTime(BLOCK, { kind: 'profile' })).toEqual({ success: true })
    expect(queries.some((q: Recorded) => used(q, 'delete'))).toBe(true)
    expect(callsOf(queries[1], 'eq')).toEqual([['id', BLOCK], ['profile_id', 'me']])
  })

  it('limits a room change to that room', async () => {
    const queries = setup()
    await updateBlockedTime(BLOCK, { kind: 'room', roomId: ROOM }, input)
    expect(callsOf(queries[0], 'eq')).toEqual([['id', BLOCK], ['room_id', ROOM]])
  })

  it('reports not found when no row matched (someone else\'s block)', async () => {
    setup({ data: [], error: null })
    expect(await updateBlockedTime(BLOCK, { kind: 'profile' }, input)).toEqual({ success: false, error: 'Blocked time not found' })
    expect(await deleteBlockedTime(BLOCK, { kind: 'profile' })).toEqual({ success: false, error: 'Blocked time not found' })
  })

  it('surfaces the first schema message on update', async () => {
    const queries = setup()
    expect(await updateBlockedTime(BLOCK, { kind: 'profile' }, { ...input, preset: 'pick', weekdays: [] })).toEqual({ success: false, error: 'Pick at least one day' })
    expect(queries).toHaveLength(0)
  })

  it('needs write access for the subject module', async () => {
    setup(undefined, ['scheduler:1'])
    expect(await deleteBlockedTime(BLOCK, { kind: 'profile' })).toEqual(DENIED)
    expect(await updateBlockedTime(BLOCK, { kind: 'room', roomId: ROOM }, input)).toEqual(DENIED)
  })
})
