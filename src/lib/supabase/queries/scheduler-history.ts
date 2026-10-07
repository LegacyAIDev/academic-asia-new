import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type SchedulerBookingHistoryEntry = {
  id: number
  booking_id: string
  action: string
  actor_id: string | null
  at: string
  changes: unknown
  actor: { first_name: string | null; surname: string | null } | null
}

/** Audit trail for a single booking, newest first, for the booking detail drawer. */
export async function getBookingHistory(bookingId: string): Promise<SchedulerBookingHistoryEntry[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('scheduler_booking_history')
    .select('id, booking_id, action, actor_id, at, changes, actor:profiles(first_name, surname)')
    .eq('booking_id', bookingId)
    .order('at', { ascending: false })

  if (error) {
    console.error('Error fetching scheduler booking history:', error)
    return []
  }
  return (data ?? []) as unknown as SchedulerBookingHistoryEntry[]
}
