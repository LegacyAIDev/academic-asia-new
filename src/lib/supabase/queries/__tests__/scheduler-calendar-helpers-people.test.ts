import { describe, it, expect, vi, afterEach } from 'vitest'
import { attachAttendees, bookingIdsForPeople } from '../scheduler-calendar-helpers'
import { callsOf, makeSupabaseStub, type Recorded } from './supabase-stub'
import { makeItem } from '@/lib/scheduler/__tests__/calendar-item-fixture'

const PROFILE = '11111111-1111-4111-8111-111111111111'
const STUDENT = '22222222-2222-4222-8222-222222222222'
const range = { from: '2026-03-09', to: '2026-03-15' }

afterEach(() => vi.restoreAllMocks())

const byTable = (queries: Recorded[], table: string) => queries.filter(q => q.table === table)

describe('bookingIdsForPeople', () => {
  const people = { profileIds: [PROFILE], studentIds: [STUDENT] }

  it('bounds attendee lookups by the range and excludes cancelled bookings', async () => {
    const { supabase, queries } = makeSupabaseStub()
    await bookingIdsForPeople(supabase, people, range, false)
    const attendee = byTable(queries, 'scheduler_booking_attendees')
    expect(attendee).toHaveLength(2)
    for (const q of attendee) {
      expect(callsOf(q, 'gte')).toEqual([['booking.local_date', range.from]])
      expect(callsOf(q, 'lte')).toEqual([['booking.local_date', range.to]])
      expect(callsOf(q, 'neq')).toEqual([['booking.status', 'cancelled']])
    }
    expect(callsOf(byTable(queries, 'scheduler_bookings')[0], 'neq')).toEqual([['status', 'cancelled']])
  })

  it('keeps cancelled bookings when asked to include them', async () => {
    const { supabase, queries } = makeSupabaseStub()
    await bookingIdsForPeople(supabase, people, range, true)
    expect(queries.flatMap(q => callsOf(q, 'neq'))).toEqual([])
    for (const q of byTable(queries, 'scheduler_booking_attendees')) {
      expect(callsOf(q, 'gte')).toEqual([['booking.local_date', range.from]])
    }
  })

  it('merges and de-duplicates ids from attendee, organiser and student lookups', async () => {
    const { supabase } = makeSupabaseStub(rec => {
      if (rec.table === 'scheduler_bookings') return { data: [{ id: 'b1' }, { id: 'b2' }], error: null }
      const isStudent = rec.calls.some(c => c.method === 'in' && c.args[0] === 'student_id')
      return { data: isStudent ? [{ booking_id: 'b3' }, { booking_id: 'b1' }] : [{ booking_id: 'b2' }], error: null }
    })
    const ids = await bookingIdsForPeople(supabase, people, range)
    expect([...ids].sort()).toEqual(['b1', 'b2', 'b3'])
  })

  it('tolerates a failed lookup and returns the ids that did load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { supabase } = makeSupabaseStub(rec =>
      rec.table === 'scheduler_bookings' ? { data: null, error: { message: 'x' } } : { data: [{ booking_id: 'b9' }], error: null },
    )
    expect(await bookingIdsForPeople(supabase, { profileIds: [PROFILE], studentIds: [] }, range)).toEqual(['b9'])
  })
})

describe('attachAttendees', () => {
  it('merges organiser and attendee profiles without duplicates, students separate', async () => {
    const { supabase } = makeSupabaseStub(() => ({
      data: [
        { booking_id: 'b1', profile_id: 'org', student_id: null },
        { booking_id: 'b1', profile_id: 'p2', student_id: null },
        { booking_id: 'b1', profile_id: null, student_id: 's1' },
      ],
      error: null,
    }))
    const [item] = await attachAttendees(supabase, [makeItem({ booking_id: 'b1', organiser_id: 'org' })])
    expect(item.attendee_profile_ids).toEqual(['org', 'p2'])
    expect(item.attendee_student_ids).toEqual(['s1'])
  })

  it('gives rows without a booking id empty student ids and only the organiser', async () => {
    const { supabase, queries } = makeSupabaseStub()
    const [item] = await attachAttendees(supabase, [makeItem({ booking_id: null, organiser_id: null })])
    expect(item.attendee_profile_ids).toEqual([])
    expect(item.attendee_student_ids).toEqual([])
    expect(queries).toHaveLength(0)
  })

  it('fetches 250 bookings in 3 batches of at most 100 ids', async () => {
    const { supabase, queries } = makeSupabaseStub()
    const rows = Array.from({ length: 250 }, (_, i) => makeItem({ booking_id: `b${i}` }))
    await attachAttendees(supabase, rows)
    const batches = queries.flatMap(q => callsOf(q, 'in'))
    expect(batches).toHaveLength(3)
    expect(batches.every(([column]) => column === 'booking_id')).toBe(true)
    expect(batches.map(([, ids]) => (ids as string[]).length)).toEqual([100, 100, 50])
  })
})
