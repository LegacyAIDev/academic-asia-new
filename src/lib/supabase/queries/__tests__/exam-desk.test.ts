import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callsOf, makeSupabaseStub } from './supabase-stub'

const state = vi.hoisted(() => ({ client: null as unknown }))

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({})) }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => state.client) }))

import { EXAM_DESK_MAX_ROWS, getExamDeskBookings } from '../exam-desk'

const day = { from: '2026-10-14', to: '2026-10-14' }

function setup(result: { data: unknown; error: unknown } = { data: [], error: null }) {
  const stub = makeSupabaseStub(() => result)
  state.client = stub.supabase
  return stub.queries
}

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
afterEach(() => vi.restoreAllMocks())

describe('getExamDeskBookings', () => {
  it('reads the bookings table, since the calendar view has no attendance', async () => {
    const queries = setup()
    await getExamDeskBookings(day)
    expect(queries.map(q => q.table)).toEqual(['scheduler_bookings'])
    expect(String(callsOf(queries[0], 'select')[0][0])).toContain('attendance')
  })

  it('asks only for examination bookings that are not cancelled', async () => {
    const queries = setup()
    await getExamDeskBookings(day)
    expect(callsOf(queries[0], 'in')).toEqual([['booking_type', ['examination', 'group_examination']]])
    expect(callsOf(queries[0], 'neq')).toEqual([['status', 'cancelled']])
  })

  it('limits the result to the chosen business dates, earliest first', async () => {
    const queries = setup()
    await getExamDeskBookings({ from: '2026-10-14', to: '2026-10-20' })
    expect(callsOf(queries[0], 'gte')).toEqual([['local_date', '2026-10-14']])
    expect(callsOf(queries[0], 'lte')).toEqual([['local_date', '2026-10-20']])
    expect(callsOf(queries[0], 'order')).toEqual([['start_at']])
    expect(callsOf(queries[0], 'limit')).toEqual([[EXAM_DESK_MAX_ROWS]])
  })

  it('returns the rows it was given', async () => {
    setup({ data: [{ id: 'booking-1' }], error: null })
    expect(await getExamDeskBookings(day)).toEqual([{ id: 'booking-1' }])
  })

  it('returns nothing without querying when the range exceeds 62 days', async () => {
    const queries = setup()
    expect(await getExamDeskBookings({ from: '2026-01-01', to: '2026-03-10' })).toEqual([])
    expect(queries).toHaveLength(0)
  })

  it('returns nothing and logs when the query fails', async () => {
    setup({ data: null, error: { message: 'boom' } })
    expect(await getExamDeskBookings(day)).toEqual([])
    expect(console.error).toHaveBeenCalled()
  })
})
