import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callsOf, makeSupabaseStub } from './supabase-stub'

const state = vi.hoisted(() => ({ client: null as unknown }))

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({})) }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => state.client) }))

import { getCalendarItems } from '../scheduler-bookings'

const filters = { from: '2026-03-09', to: '2026-03-15' }

function setup(rows: unknown[] = []) {
  const stub = makeSupabaseStub(() => ({ data: rows, error: null }))
  state.client = stub.supabase
  return stub.queries
}

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
afterEach(() => vi.restoreAllMocks())

describe('getCalendarItems - source selection', () => {
  it('reads cancelled bookings from the base table, never the active-only view', async () => {
    const queries = setup()
    await getCalendarItems({ ...filters, status: 'cancelled' })
    const tables = queries.map(q => q.table)
    expect(tables).toContain('scheduler_bookings')
    expect(tables).not.toContain('scheduler_calendar_items')
    expect(callsOf(queries[0], 'eq')).toEqual([['status', 'cancelled']])
  })

  it('reads the view and filters on status for a confirmed filter', async () => {
    const queries = setup()
    await getCalendarItems({ ...filters, status: 'confirmed' })
    expect(queries[0].table).toBe('scheduler_calendar_items')
    expect(callsOf(queries[0], 'eq')).toEqual([['status', 'confirmed']])
    expect(queries.map(q => q.table)).not.toContain('scheduler_bookings')
  })

  it('reads the view without a status filter when none is chosen', async () => {
    const queries = setup()
    await getCalendarItems(filters)
    expect(queries[0].table).toBe('scheduler_calendar_items')
    expect(callsOf(queries[0], 'eq')).toEqual([])
    expect(callsOf(queries[0], 'gte')).toEqual([['local_date', filters.from]])
  })

  it('returns nothing without querying when the range exceeds 62 days', async () => {
    const queries = setup()
    expect(await getCalendarItems({ from: '2026-01-01', to: '2026-03-10' })).toEqual([])
    expect(queries).toHaveLength(0)
  })

  it('allows a range of exactly 62 days', async () => {
    const queries = setup()
    await getCalendarItems({ from: '2026-01-01', to: '2026-03-04' })
    expect(queries.length).toBeGreaterThan(0)
  })
})
