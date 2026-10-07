import { cookies } from 'next/headers'
import { differenceInCalendarDays } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { MAX_RANGE_DAYS } from '@/lib/scheduler/config'
import type { Database } from '@/types/database'

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

/** Booking ids where any of the given people take part, as attendee or organiser. */
async function bookingIdsForPeople(
  supabase: ReturnType<typeof createClient>,
  profileIds: string[],
  studentIds: string[],
): Promise<string[]> {
  const ids = new Set<string>()
  if (profileIds.length > 0) {
    const [attendees, organised] = await Promise.all([
      supabase.from('scheduler_booking_attendees').select('booking_id').in('profile_id', profileIds),
      supabase.from('scheduler_bookings').select('id').in('organiser_id', profileIds).neq('status', 'cancelled'),
    ])
    attendees.data?.forEach(r => ids.add(r.booking_id))
    organised.data?.forEach(r => ids.add(r.id))
  }
  if (studentIds.length > 0) {
    const { data } = await supabase.from('scheduler_booking_attendees').select('booking_id').in('student_id', studentIds)
    data?.forEach(r => ids.add(r.booking_id))
  }
  return [...ids]
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
  const peopleBookingIds = peopleFilter ? await bookingIdsForPeople(supabase, profileIds, studentIds) : []

  let query = supabase
    .from('scheduler_calendar_items')
    .select('*')
    .gte('local_date', filters.from)
    .lte('local_date', filters.to)
    .order('start_at')

  if (filters.types?.length) query = query.in('booking_type', filters.types)
  if (filters.roomIds?.length) query = query.in('room_id', filters.roomIds)
  if (filters.status && filters.status !== 'cancelled') query = query.eq('status', filters.status)
  if (peopleFilter) {
    const clauses: string[] = []
    if (studentIds.length > 0) clauses.push(`student_id.in.(${studentIds.join(',')})`)
    if (peopleBookingIds.length > 0) clauses.push(`booking_id.in.(${peopleBookingIds.join(',')})`)
    if (clauses.length === 0) return []
    query = query.or(clauses.join(','))
  }

  const { data, error } = await query
  if (error) {
    console.error('getCalendarItems failed:', error)
    return []
  }

  const rows = (data ?? []) as CalendarItemRow[]
  const bookingIds = rows.map(r => r.booking_id).filter((id): id is string => Boolean(id))
  const attendeesByBooking = new Map<string, { profiles: string[]; students: string[] }>()

  if (bookingIds.length > 0) {
    const { data: attendees } = await supabase
      .from('scheduler_booking_attendees')
      .select('booking_id, profile_id, student_id')
      .in('booking_id', bookingIds)
    for (const a of attendees ?? []) {
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

/** Cancelled bookings for a date range, read from the base table since the view hides them. */
export async function getCancelledBookings(from: string, to: string): Promise<BookingRow[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('scheduler_bookings')
    .select('*')
    .eq('status', 'cancelled')
    .gte('local_date', from)
    .lte('local_date', to)
    .order('start_at')

  if (error) {
    console.error('getCancelledBookings failed:', error)
    return []
  }
  return data ?? []
}
