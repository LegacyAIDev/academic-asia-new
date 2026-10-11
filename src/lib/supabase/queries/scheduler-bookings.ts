import { cookies } from 'next/headers'
import { differenceInCalendarDays } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { MAX_RANGE_DAYS } from '@/lib/scheduler/config'
import type { Database } from '@/types/database'
import { attachAttendees, bookingIdsForPeople, fetchCancelledRows } from './scheduler-calendar-helpers'
import { peopleOrFilter } from '@/lib/scheduler/people-filter'

type CalendarItemRow = Database['public']['Views']['scheduler_calendar_items']['Row']
type BookingRow = Database['public']['Tables']['scheduler_bookings']['Row']

export type CalendarItem = CalendarItemRow & {
  attendee_profile_ids: string[]
  attendee_student_ids: string[]
}

export type CalendarFilters = {
  /** Inclusive business-timezone dates, YYYY-MM-DD. */
  from: string
  to: string
  types?: string[]
  profileIds?: string[]
  studentIds?: string[]
  roomIds?: string[]
  status?: 'pending' | 'confirmed' | 'cancelled'
}

type PersonName = { id: string; first_name: string | null; surname: string | null } | null

export type BookingAttendee = {
  id: string
  profile_id: string | null
  student_id: string | null
  role: string
  seat_no: number | null
  application_id: string | null
  profile: PersonName
  student: (PersonName & { student_code: string | null }) | null
}

export type BookingDetail = BookingRow & {
  room: {
    id: string
    display_name: string
    floor: string | null
    room_number: string | null
    capacity: number
    location: { name: string; address: string | null } | null
  } | null
  organiser: PersonName
  confirmer: PersonName
  student: (PersonName & { student_code: string | null }) | null
  school: { id: string; name: string | null } | null
  attendees: BookingAttendee[]
}

/** Calendar rows for a date range with optional filters; attendee ids are attached for colouring. */
export async function getCalendarItems(filters: CalendarFilters): Promise<CalendarItem[]> {
  if (differenceInCalendarDays(new Date(filters.to), new Date(filters.from)) > MAX_RANGE_DAYS) {
    console.error('getCalendarItems: range exceeds', MAX_RANGE_DAYS, 'days')
    return []
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const profileIds = filters.profileIds ?? []
  const studentIds = filters.studentIds ?? []
  const peopleFilter = profileIds.length > 0 || studentIds.length > 0
  const wantsCancelled = filters.status === 'cancelled'
  const peopleBookingIds = peopleFilter
    ? await bookingIdsForPeople(supabase, { profileIds, studentIds }, { from: filters.from, to: filters.to }, wantsCancelled)
    : []

  // The view only holds active bookings, so cancelled ones come from the base table.
  if (wantsCancelled) {
    const rows = await fetchCancelledRows(supabase, filters, peopleFilter ? peopleBookingIds : null)
    return attachAttendees(supabase, rows)
  }

  let query = supabase
    .from('scheduler_calendar_items')
    .select('*')
    .gte('local_date', filters.from)
    .lte('local_date', filters.to)
    .order('start_at')

  if (filters.types?.length) query = query.in('booking_type', filters.types)
  if (filters.roomIds?.length) query = query.in('room_id', filters.roomIds)
  if (filters.status) query = query.eq('status', filters.status)
  if (peopleFilter) {
    const filter = peopleOrFilter(studentIds, peopleBookingIds, 'booking_id')
    if (!filter) return []
    query = query.or(filter)
  }

  const { data, error } = await query
  if (error) {
    console.error('getCalendarItems failed:', error)
    return []
  }
  return attachAttendees(supabase, (data ?? []) as CalendarItemRow[])
}

/** One booking with room, people and attendees for the details view. */
export async function getBooking(id: string): Promise<BookingDetail | null> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('scheduler_bookings')
    .select(
      `*,
       room:scheduler_rooms(id, display_name, floor, room_number, capacity, location:scheduler_locations(name, address)),
       organiser:profiles!scheduler_bookings_organiser_id_fkey(id, first_name, surname),
       confirmer:profiles!scheduler_bookings_confirmed_by_fkey(id, first_name, surname),
       student:students(id, first_name, surname, student_code),
       school:schools(id, name),
       attendees:scheduler_booking_attendees(id, profile_id, student_id, role, seat_no, application_id,
         profile:profiles(id, first_name, surname), student:students(id, first_name, surname, student_code))`,
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('getBooking failed:', error)
    return null
  }
  return (data as unknown as BookingDetail | null) ?? null
}
