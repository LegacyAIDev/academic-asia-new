import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type SchedulerLocation = {
  id: string
  name: string
  address: string | null
  building: string | null
  is_active: boolean
  sort_order: number
}

export type SchedulerRoom = {
  id: string
  location_id: string
  display_name: string
  floor: string | null
  room_number: string | null
  capacity: number
  is_exam_suitable: boolean
  online_station_count: number
  is_accessible: boolean
  facilities_notes: string | null
  color: string | null
  is_active: boolean
  sort_order: number
  location: { id: string; name: string; address: string | null; building: string | null } | null
  booking_count: number
}

/** Bookable sites (office branches), optionally including inactive ones. */
export async function getLocations(params: { includeInactive?: boolean } = {}): Promise<SchedulerLocation[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  let query = supabase
    .from('scheduler_locations')
    .select('id, name, address, building, is_active, sort_order')
    .order('sort_order', { ascending: true })

  if (!params.includeInactive) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching scheduler locations:', error)
    return []
  }
  return data ?? []
}

/**
 * Rooms with their location and a live count of non-cancelled bookings, used
 * to warn admins before they deactivate or delete a room that's in use.
 */
export async function getRooms(params: { includeInactive?: boolean } = {}): Promise<SchedulerRoom[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  let query = supabase
    .from('scheduler_rooms')
    .select(`
      id, location_id, display_name, floor, room_number, capacity,
      is_exam_suitable, online_station_count, is_accessible, facilities_notes,
      color, is_active, sort_order,
      location:scheduler_locations(id, name, address, building)
    `)
    .order('sort_order', { ascending: true })

  if (!params.includeInactive) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching scheduler rooms:', error)
    return []
  }

  const rooms = (data ?? []) as unknown as Omit<SchedulerRoom, 'booking_count'>[]
  if (rooms.length === 0) return []

  // Booking counts fetched per room via head counts — the table has no
  // group-by-count RPC, and this stays simple for the handful of rooms in use.
  const counts = await Promise.all(
    rooms.map((room) =>
      supabase
        .from('scheduler_bookings')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', room.id)
        .neq('status', 'cancelled'),
    ),
  )

  return rooms.map((room, index) => ({
    ...room,
    booking_count: counts[index].count ?? 0,
  }))
}

/** Single room with its location, for edit forms. */
export async function getRoom(id: string): Promise<SchedulerRoom | null> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('scheduler_rooms')
    .select(`
      id, location_id, display_name, floor, room_number, capacity,
      is_exam_suitable, online_station_count, is_accessible, facilities_notes,
      color, is_active, sort_order,
      location:scheduler_locations(id, name, address, building)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching scheduler room:', error)
    return null
  }

  const { count } = await supabase
    .from('scheduler_bookings')
    .select('id', { count: 'exact', head: true })
    .eq('room_id', id)
    .neq('status', 'cancelled')

  return { ...(data as unknown as Omit<SchedulerRoom, 'booking_count'>), booking_count: count ?? 0 }
}
