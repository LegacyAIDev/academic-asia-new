import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { BusyInterval } from '@/lib/scheduler/conflicts'
import type { Database } from '@/types/database'

type FreeBusyRow = Database['public']['Functions']['scheduler_free_busy']['Returns'][number]

export type FreeBusyParams = {
  from: string
  to: string
  profileIds?: string[]
  studentIds?: string[]
  roomIds?: string[]
  excludeBookingId?: string | null
}

export type AvailableRoom = {
  room_id: string
  display_name: string
  floor: string | null
  room_number: string | null
  location_name: string
  capacity: number
  remaining: number
  is_exam_suitable: boolean
  is_accessible: boolean
  online_station_count: number
}

export type AvailableRoomsParams = {
  from: string
  to: string
  seats?: number
  examOnly?: boolean
  excludeBookingId?: string | null
}

/** Busy intervals for the given people and rooms inside [from, to). */
export async function getFreeBusy(params: FreeBusyParams): Promise<BusyInterval[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase.rpc('scheduler_free_busy', {
    p_from: params.from,
    p_to: params.to,
    p_profile_ids: params.profileIds ?? [],
    p_student_ids: params.studentIds ?? [],
    p_room_ids: params.roomIds ?? [],
    p_exclude_booking_id: params.excludeBookingId ?? undefined,
  })

  if (error) {
    console.error('getFreeBusy failed:', error)
    return []
  }

  return ((data ?? []) as FreeBusyRow[]).map(row => ({
    subjectKind: row.subject_kind as BusyInterval['subjectKind'],
    subjectId: row.subject_id,
    itemSource: row.item_source,
    itemId: row.item_id,
    title: row.title,
    bookingType: row.booking_type,
    startAt: row.start_at,
    endAt: row.end_at,
  }))
}

/** Active rooms that can still take the requested seats in [from, to), best fit first. */
export async function getAvailableRooms(params: AvailableRoomsParams): Promise<AvailableRoom[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase.rpc('scheduler_available_rooms', {
    p_from: params.from,
    p_to: params.to,
    p_seats: params.seats ?? 1,
    p_exam_only: params.examOnly ?? false,
    p_exclude_booking: params.excludeBookingId ?? undefined,
  })

  if (error) {
    console.error('getAvailableRooms failed:', error)
    return []
  }

  return (data ?? []) as AvailableRoom[]
}
