'use server'

import { differenceInCalendarDays } from 'date-fns'
import { assertAccess } from '@/lib/permissions/guard'
import { MAX_RANGE_DAYS } from '@/lib/scheduler/config'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { findConflicts, type ConflictSummary } from '@/lib/scheduler/conflicts'
import {
  getAvailableRooms,
  getFreeBusy,
  type AvailableRoom,
  type AvailableRoomsParams,
  type FreeBusyParams,
} from '@/lib/supabase/queries/scheduler-availability'

export type ActionResult<T = void> = { success: boolean; data?: T; error?: string }

/** Availability lookups are per booking; refuse ranges wider than the calendar itself shows. */
function rangeTooWide(from: string, to: string): boolean {
  const days = differenceInCalendarDays(new Date(to), new Date(from))
  return Number.isNaN(days) || days < 0 || days > MAX_RANGE_DAYS
}

/** Who among the given people and rooms is already busy in the requested slot. */
export async function checkAvailability(params: FreeBusyParams): Promise<ActionResult<ConflictSummary>> {
  const denied = await assertAccess(MODULES.SCHEDULER, ACCESS.READ)
  if (denied) return denied
  if (rangeTooWide(params.from, params.to)) return { success: false, error: 'Invalid time range' }

  try {
    const busy = await getFreeBusy(params)
    return { success: true, data: findConflicts({ startAt: params.from, endAt: params.to }, busy) }
  } catch (error) {
    console.error('checkAvailability failed:', error)
    return { success: false, error: 'Failed to check availability' }
  }
}

/** Rooms that can still take the requested number of seats in the slot, best fit first. */
export async function findAvailableRooms(params: AvailableRoomsParams): Promise<ActionResult<AvailableRoom[]>> {
  const denied = await assertAccess(MODULES.SCHEDULER, ACCESS.READ)
  if (denied) return denied
  if (rangeTooWide(params.from, params.to)) return { success: false, error: 'Invalid time range' }

  try {
    return { success: true, data: await getAvailableRooms(params) }
  } catch (error) {
    console.error('findAvailableRooms failed:', error)
    return { success: false, error: 'Failed to find rooms' }
  }
}
