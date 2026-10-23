import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import { hkDateRangeToInstants, type BlockedOccurrence, type BlockedTime } from '@/lib/scheduler/blocked-times'

/** PostgREST caps a response at 1,000 rows, so larger reads are fetched page by page. */
const PAGE_SIZE = 1000

async function fetchAllPages<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await fetchPage(offset, offset + PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if ((data?.length ?? 0) < PAGE_SIZE) return rows
  }
}

type OccurrenceRow = Database['public']['Functions']['scheduler_blocked_time_occurrences']['Returns'][number]
type RoomItemRow = Pick<Database['public']['Views']['scheduler_calendar_items']['Row'], 'booking_id' | 'source_id' | 'title' | 'start_at' | 'end_at'>

const BLOCK_COLUMNS = 'id, label, profile_id, room_id, weekdays, start_time, end_time, starts_on, ends_on'

/** Stored blocks of one person or of some rooms, oldest first. Empty on error. */
export async function listBlockedTimes(filter: { profileId: string } | { roomIds: string[] }): Promise<BlockedTime[]> {
  if ('roomIds' in filter && filter.roomIds.length === 0) return []
  const supabase = createClient(await cookies())

  try {
    return await fetchAllPages<BlockedTime>((from, to) => {
      const query = supabase.from('scheduler_blocked_times').select(BLOCK_COLUMNS)
      const scoped = 'profileId' in filter ? query.eq('profile_id', filter.profileId) : query.in('room_id', filter.roomIds)
      return scoped.order('created_at').order('id').range(from, to)
    })
  } catch (error) {
    console.error('listBlockedTimes failed:', error)
    return []
  }
}

/** Occurrences overlapping the inclusive business-day range, for the given people and rooms. Empty on error. */
export async function getBlockedTimeOccurrences(params: {
  from: string
  to: string
  profileIds?: string[]
  roomIds?: string[]
}): Promise<BlockedOccurrence[]> {
  const profileIds = params.profileIds ?? []
  const roomIds = params.roomIds ?? []
  if (profileIds.length === 0 && roomIds.length === 0) return []

  const supabase = createClient(await cookies())
  const range = hkDateRangeToInstants(params.from, params.to)

  try {
    const rows = await fetchAllPages<OccurrenceRow>((from, to) =>
      supabase
        .rpc('scheduler_blocked_time_occurrences', {
          p_from: range.from,
          p_to: range.to,
          p_profile_ids: profileIds,
          p_room_ids: roomIds,
        })
        .order('start_at')
        .order('blocked_time_id')
        .range(from, to),
    )
    return rows.map(row => ({
      blockedTimeId: row.blocked_time_id,
      label: row.label,
      profileId: row.profile_id,
      roomId: row.room_id,
      startAt: row.start_at,
      endAt: row.end_at,
    }))
  } catch (error) {
    console.error('getBlockedTimeOccurrences failed:', error)
    return []
  }
}

export type RoomItem = { bookingId: string | null; title: string; startAt: string; endAt: string }

/** Calendar items (bookings and exam sessions) in one room inside the inclusive business-day range. */
export async function getRoomItemsInRange(roomId: string, fromDate: string, toDate: string): Promise<RoomItem[]> {
  const supabase = createClient(await cookies())
  const range = hkDateRangeToInstants(fromDate, toDate)

  try {
    const rows = await fetchAllPages<RoomItemRow>((from, to) =>
      supabase
        .from('scheduler_calendar_items')
        .select('booking_id, source_id, title, start_at, end_at')
        .eq('room_id', roomId)
        .lt('start_at', range.to)
        .gt('end_at', range.from)
        .order('start_at')
        .order('source_id')
        .range(from, to),
    )
    return rows.flatMap(row =>
      row.start_at && row.end_at
        ? [{ bookingId: row.booking_id, title: row.title ?? 'Untitled', startAt: row.start_at, endAt: row.end_at }]
        : [],
    )
  } catch (error) {
    console.error('getRoomItemsInRange failed:', error)
    return []
  }
}
