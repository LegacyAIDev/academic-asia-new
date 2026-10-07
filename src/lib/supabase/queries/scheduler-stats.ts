import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

/** Count of exam bookings still awaiting confirmation, for the dashboard badge. */
export async function getPendingExamBookingCount(): Promise<number> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { count, error } = await supabase
    .from('scheduler_bookings')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
    .in('booking_type', ['examination', 'group_examination'])

  if (error) {
    console.error('Error fetching pending exam booking count:', error)
    return 0
  }
  return count ?? 0
}
