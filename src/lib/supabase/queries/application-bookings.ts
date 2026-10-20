import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { canAccess } from '@/lib/permissions/guard'
import { MODULES } from '@/lib/permissions/modules'
import type { Json } from '@/types/database'

export type ApplicationBooking = {
  id: string
  title: string
  booking_type: string
  status: string
  attendance: string | null
  start_at: string
  end_at: string
  local_date: string
  assessment_snapshot: Json | null
  room: { display_name: string } | null
}

/**
 * Scheduler bookings linked to one application (exams, interviews, meetings),
 * earliest first, cancelled ones included so the history stays complete.
 *
 * Bookings belong to the scheduler, so a user without scheduler access gets an
 * empty list here rather than relying on every page to check first.
 */
export async function getApplicationBookings(applicationId: string): Promise<ApplicationBooking[]> {
  if (!(await canAccess(MODULES.SCHEDULER))) return []

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('scheduler_bookings')
    .select('id, title, booking_type, status, attendance, start_at, end_at, local_date, assessment_snapshot, room:scheduler_rooms(display_name)')
    .eq('application_id', applicationId)
    .order('start_at')

  if (error) {
    console.error('Error fetching application bookings:', error)
    return []
  }

  return (data ?? []) as unknown as ApplicationBooking[]
}
