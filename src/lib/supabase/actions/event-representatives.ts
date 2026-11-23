'use server'

import type { ActionResult } from '@/lib/action-result'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'


export type CreateRepresentativeInput = {
  event_id: string
  school_id?: string | null
  school_contact_id?: string | null
  name: string
  role?: string | null
  venue_room?: string | null
  available_from?: string | null
  available_to?: string | null
  slot_length_minutes?: number | null
  remarks?: string | null
}

/** Add a representative to an event */
export async function addRepresentative(
  input: CreateRepresentativeInput
): Promise<ActionResult<{ id: string }>> {
  const denied = await assertAccess(MODULES.EVENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data, error } = await supabase
      .from('event_representatives')
      .insert(input)
      .select('id')
      .single()
    if (error) {
      console.error('Error adding representative:', error)
      return { success: false, error: error.message }
    }
    revalidatePath('/events')
    return { success: true, data: { id: data.id } }
  } catch (err) {
    console.error('Error in addRepresentative:', err)
    return { success: false, error: 'Failed to add representative' }
  }
}
