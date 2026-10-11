import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type PendingExamBookings = {
  count: number
  /** Business date (YYYY-MM-DD) of the earliest pending exam booking, if any. */
  earliestDate: string | null
}

/** Exam bookings still awaiting confirmation, for the dashboard alert. */
export async function getPendingExamBookings(): Promise<PendingExamBookings> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, count, error } = await supabase
    .from('scheduler_bookings')
    .select('local_date', { count: 'exact' })
    .eq('status', 'pending')
    .in('booking_type', ['examination', 'group_examination'])
    .order('local_date', { ascending: true })
    .limit(1)

  if (error) {
    console.error('Error fetching pending exam bookings:', error)
    return { count: 0, earliestDate: null }
  }
  return { count: count ?? 0, earliestDate: data?.[0]?.local_date ?? null }
}
