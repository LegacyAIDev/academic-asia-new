import type { createClient } from '@/lib/supabase/server'
import { cancelledBookingToCalendarRow, type CancelledBookingRow } from '@/lib/scheduler/cancelled-items'
import { peopleOrFilter } from '@/lib/scheduler/people-filter'
import type { Database } from '@/types/database'
import type { CalendarFilters, CalendarItem } from './scheduler-bookings'

type Supabase = ReturnType<typeof createClient>
type CalendarItemRow = Database['public']['Views']['scheduler_calendar_items']['Row']

/**
 * Ids of bookings in the date range where any of the given people take part as
 * attendee or organiser. Bounded by the range so long histories never blow up
 * the id list that is sent back to the database.
 */
export async function bookingIdsForPeople(
  supabase: Supabase,
  people: { profileIds: string[]; studentIds: string[] },
  range: { from: string; to: string },
  includeCancelled = false,
): Promise<string[]> {
  const ids = new Set<string>()
  const attendeeBookings = () => {
    const query = supabase
      .from('scheduler_booking_attendees')
      .select('booking_id, booking:scheduler_bookings!inner(local_date, status)')
      .gte('booking.local_date', range.from)
      .lte('booking.local_date', range.to)
    return includeCancelled ? query : query.neq('booking.status', 'cancelled')
  }

  if (people.profileIds.length > 0) {
    let organised = supabase
      .from('scheduler_bookings')
      .select('id')
      .in('organiser_id', people.profileIds)
      .gte('local_date', range.from)
      .lte('local_date', range.to)
    if (!includeCancelled) organised = organised.neq('status', 'cancelled')
    const [attending, organising] = await Promise.all([attendeeBookings().in('profile_id', people.profileIds), organised])
    if (attending.error) console.error('bookingIdsForPeople: staff attendee lookup failed:', attending.error)
    if (organising.error) console.error('bookingIdsForPeople: organiser lookup failed:', organising.error)
    attending.data?.forEach(r => ids.add(r.booking_id))
    organising.data?.forEach(r => ids.add(r.id))
  }
  if (people.studentIds.length > 0) {
    const { data, error } = await attendeeBookings().in('student_id', people.studentIds)
    if (error) console.error('bookingIdsForPeople: student attendee lookup failed:', error)
    data?.forEach(r => ids.add(r.booking_id))
  }
  return [...ids]
}

/** Cancelled bookings for the range and filters, read from the base table and shaped like view rows. */
export async function fetchCancelledRows(
  supabase: Supabase,
  filters: CalendarFilters,
  peopleBookingIds: string[] | null,
): Promise<CalendarItemRow[]> {
  const peopleFilter = peopleBookingIds ? peopleOrFilter(filters.studentIds ?? [], peopleBookingIds, 'id') : undefined
  if (peopleFilter === null) return []

  let query = supabase
    .from('scheduler_bookings')
    .select('*, room:scheduler_rooms(display_name, floor, room_number, location:scheduler_locations(name))')
    .eq('status', 'cancelled')
    .gte('local_date', filters.from)
    .lte('local_date', filters.to)
    .order('start_at')

  if (filters.types?.length) query = query.in('booking_type', filters.types)
  if (filters.roomIds?.length) query = query.in('room_id', filters.roomIds)
  if (peopleFilter) query = query.or(peopleFilter)

  const { data, error } = await query
  if (error) {
    console.error('fetchCancelledRows failed:', error)
    return []
  }
  return ((data ?? []) as unknown as CancelledBookingRow[]).map(cancelledBookingToCalendarRow)
}

/** Ids go into the request URL, so long lists are fetched in batches to stay under URL length limits. */
const ID_BATCH = 100

export function inBatches<T>(items: T[], size = ID_BATCH): T[][] {
  const batches: T[][] = []
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size))
  return batches
}

/** Adds the attendee ids of each booking row so the calendar can colour or split by person. */
export async function attachAttendees(supabase: Supabase, rows: CalendarItemRow[]): Promise<CalendarItem[]> {
  const bookingIds = rows.map(r => r.booking_id).filter((id): id is string => Boolean(id))
  const attendeesByBooking = new Map<string, { profiles: string[]; students: string[] }>()

  const results = await Promise.all(
    inBatches(bookingIds).map(batch =>
      supabase.from('scheduler_booking_attendees').select('booking_id, profile_id, student_id').in('booking_id', batch),
    ),
  )
  for (const { data, error } of results) {
    if (error) console.error('attachAttendees failed:', error)
    for (const a of data ?? []) {
      const entry = attendeesByBooking.get(a.booking_id) ?? { profiles: [], students: [] }
      if (a.profile_id) entry.profiles.push(a.profile_id)
      if (a.student_id) entry.students.push(a.student_id)
      attendeesByBooking.set(a.booking_id, entry)
    }
  }

  return rows.map(row => {
    const entry = row.booking_id ? attendeesByBooking.get(row.booking_id) : undefined
    const organiser = row.organiser_id ? [row.organiser_id] : []
    return {
      ...row,
      attendee_profile_ids: [...new Set([...organiser, ...(entry?.profiles ?? [])])],
      attendee_student_ids: entry?.students ?? [],
    }
  })
}
