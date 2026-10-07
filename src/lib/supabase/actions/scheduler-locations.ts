'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { revalidateSchedulerPaths, toActionResult, type ActionResult } from '@/lib/scheduler/action-helpers'
import { locationFormSchema } from '@/lib/scheduler/room-schema'

export type CreateLocationInput = {
  name: string
  address?: string | null
  building?: string | null
  sort_order?: number | null
}

export type UpdateLocationInput = Partial<CreateLocationInput>

export async function createLocation(input: CreateLocationInput): Promise<ActionResult<{ id: string }>> {
  const denied = await assertAccess(MODULES.EXAMS, ACCESS.WRITE)
  if (denied) return denied
  const parsed = locationFormSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid location' }

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('scheduler_locations')
      .insert(input as never)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating scheduler location:', error)
      return toActionResult(error)
    }

    revalidateSchedulerPaths()
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('Error in createLocation:', err)
    return { success: false, error: 'Failed to create location' }
  }
}

export async function updateLocation(id: string, input: UpdateLocationInput): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.EXAMS, ACCESS.WRITE)
  if (denied) return denied
  const parsed = locationFormSchema.partial().safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid location' }

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('scheduler_locations')
      .update(input as never)
      .eq('id', id)

    if (error) {
      console.error('Error updating scheduler location:', error)
      return toActionResult(error)
    }

    revalidateSchedulerPaths()
    return { success: true }
  } catch (err) {
    console.error('Error in updateLocation:', err)
    return { success: false, error: 'Failed to update location' }
  }
}

export async function setLocationActive(id: string, active: boolean): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.EXAMS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('scheduler_locations')
      .update({ is_active: active } as never)
      .eq('id', id)

    if (error) {
      console.error('Error toggling scheduler location active state:', error)
      return { success: false, error: error.message }
    }

    revalidateSchedulerPaths()
    return { success: true }
  } catch (err) {
    console.error('Error in setLocationActive:', err)
    return { success: false, error: 'Failed to update location' }
  }
}
