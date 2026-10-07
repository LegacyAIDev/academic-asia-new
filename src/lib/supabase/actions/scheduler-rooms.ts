'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { revalidateSchedulerPaths, toActionResult, type ActionResult } from '@/lib/scheduler/action-helpers'
import { roomFormSchema } from '@/lib/scheduler/room-schema'

export type CreateRoomInput = {
  location_id: string
  display_name: string
  floor?: string | null
  room_number?: string | null
  capacity?: number | null
  is_exam_suitable?: boolean | null
  online_station_count?: number | null
  is_accessible?: boolean | null
  facilities_notes?: string | null
  color?: string | null
  sort_order?: number | null
}

export type UpdateRoomInput = Partial<CreateRoomInput>

/** Postgres unique-violation is the only conflict these tables can hit (name/display_name). */
export async function createRoom(input: CreateRoomInput): Promise<ActionResult<{ id: string }>> {
  const denied = await assertAccess(MODULES.EXAMS, ACCESS.WRITE)
  if (denied) return denied
  const parsed = roomFormSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid room' }

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('scheduler_rooms')
      .insert(input as never)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating scheduler room:', error)
      return toActionResult(error)
    }

    revalidateSchedulerPaths()
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('Error in createRoom:', err)
    return { success: false, error: 'Failed to create room' }
  }
}

export async function updateRoom(id: string, input: UpdateRoomInput): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.EXAMS, ACCESS.WRITE)
  if (denied) return denied
  const parsed = roomFormSchema.partial().safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid room' }

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('scheduler_rooms')
      .update(input as never)
      .eq('id', id)

    if (error) {
      console.error('Error updating scheduler room:', error)
      return toActionResult(error)
    }

    revalidateSchedulerPaths()
    return { success: true }
  } catch (err) {
    console.error('Error in updateRoom:', err)
    return { success: false, error: 'Failed to update room' }
  }
}

export async function setRoomActive(id: string, active: boolean): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.EXAMS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('scheduler_rooms')
      .update({ is_active: active } as never)
      .eq('id', id)

    if (error) {
      console.error('Error toggling scheduler room active state:', error)
      return { success: false, error: error.message }
    }

    revalidateSchedulerPaths()
    return { success: true }
  } catch (err) {
    console.error('Error in setRoomActive:', err)
    return { success: false, error: 'Failed to update room' }
  }
}

/** Refuses to delete a room that any booking (cancelled or not) still references. */
export async function deleteRoom(id: string): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.EXAMS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { count, error: countError } = await supabase
      .from('scheduler_bookings')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', id)

    if (countError) {
      console.error('Error checking room bookings before delete:', countError)
      return { success: false, error: countError.message }
    }

    if ((count ?? 0) > 0) {
      return { success: false, error: 'This room has bookings and cannot be deleted. Deactivate it instead.' }
    }

    const { error } = await supabase
      .from('scheduler_rooms')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting scheduler room:', error)
      return { success: false, error: error.message }
    }

    revalidateSchedulerPaths()
    return { success: true }
  } catch (err) {
    console.error('Error in deleteRoom:', err)
    return { success: false, error: 'Failed to delete room' }
  }
}
