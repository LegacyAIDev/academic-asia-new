'use server'

import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { getBooking, type BookingDetail } from '@/lib/supabase/queries/scheduler-bookings'
import { getBookingHistory, type SchedulerBookingHistoryEntry } from '@/lib/supabase/queries/scheduler-history'

export type ActionResult<T = void> = { success: boolean; data?: T; error?: string }

export type BookingDetailsPayload = {
  booking: BookingDetail
  history: SchedulerBookingHistoryEntry[]
}

/** Loads one booking with its history for the details panel; read access only. */
export async function getBookingDetailsAction(id: string): Promise<ActionResult<BookingDetailsPayload>> {
  const denied = await assertAccess(MODULES.SCHEDULER, ACCESS.READ)
  if (denied) return denied

  try {
    const [booking, history] = await Promise.all([getBooking(id), getBookingHistory(id)])
    if (!booking) return { success: false, error: 'Booking not found.' }
    return { success: true, data: { booking, history } }
  } catch (error) {
    console.error('getBookingDetailsAction failed:', error)
    return { success: false, error: 'Failed to load booking' }
  }
}
