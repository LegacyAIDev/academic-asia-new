import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchCancelledRows } from '../scheduler-calendar-helpers'
import { callsOf, makeSupabaseStub } from './supabase-stub'

const STUDENT = '11111111-1111-4111-8111-111111111111'
const BOOKING = '33333333-3333-4333-8333-333333333333'
const ROOM = '44444444-4444-4444-8444-444444444444'
const filters = { from: '2026-03-09', to: '2026-03-15' }

const bookingRow = {
  id: BOOKING,
  title: 'Mock exam',
  booking_type: 'examination',
  status: 'cancelled',
  start_at: '2026-03-10T02:00:00Z',
  end_at: '2026-03-10T03:00:00Z',
  local_date: '2026-03-10',
  room_id: ROOM,
  room: { display_name: 'Room 1', floor: '2', room_number: '201', location: { name: 'Central' } },
}

afterEach(() => vi.restoreAllMocks())

describe('fetchCancelledRows', () => {
  it('reads cancelled bookings of the date range from the base table', async () => {
    const { supabase, queries } = makeSupabaseStub()
    await fetchCancelledRows(supabase, filters, null)
    expect(queries).toHaveLength(1)
    expect(queries[0].table).toBe('scheduler_bookings')
    expect(callsOf(queries[0], 'eq')).toEqual([['status', 'cancelled']])
    expect(callsOf(queries[0], 'gte')).toEqual([['local_date', '2026-03-09']])
    expect(callsOf(queries[0], 'lte')).toEqual([['local_date', '2026-03-15']])
    expect(callsOf(queries[0], 'in')).toEqual([])
    expect(callsOf(queries[0], 'or')).toEqual([])
  })

  it('applies type and room filters when given', async () => {
    const { supabase, queries } = makeSupabaseStub()
    await fetchCancelledRows(supabase, { ...filters, types: ['examination'], roomIds: [ROOM] }, null)
    expect(callsOf(queries[0], 'in')).toEqual([
      ['booking_type', ['examination']],
      ['room_id', [ROOM]],
    ])
  })

  it('matches people by student or booking id', async () => {
    const { supabase, queries } = makeSupabaseStub()
    await fetchCancelledRows(supabase, { ...filters, studentIds: [STUDENT] }, [BOOKING])
    expect(callsOf(queries[0], 'or')).toEqual([[`student_id.in.(${STUDENT}),id.in.(${BOOKING})`]])
  })

  it('skips the query when people were chosen but nothing can match', async () => {
    const { supabase, queries } = makeSupabaseStub()
    expect(await fetchCancelledRows(supabase, filters, [])).toEqual([])
    expect(queries).toHaveLength(0)
  })

  it('maps rows to the calendar row shape', async () => {
    const { supabase } = makeSupabaseStub(() => ({ data: [bookingRow], error: null }))
    const [row] = await fetchCancelledRows(supabase, filters, null)
    expect(row).toMatchObject({
      source: 'booking',
      source_id: BOOKING,
      booking_id: BOOKING,
      status: 'cancelled',
      room_name: 'Room 1',
      room_number: '201',
      location_name: 'Central',
    })
  })

  it('returns an empty list instead of throwing on a database error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { supabase } = makeSupabaseStub(() => ({ data: null, error: { message: 'boom' } }))
    await expect(fetchCancelledRows(supabase, filters, null)).resolves.toEqual([])
  })
})
