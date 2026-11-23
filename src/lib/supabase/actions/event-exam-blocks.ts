'use server'

import type { ActionResult } from '@/lib/action-result'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'


export type CreateExamBlockInput = {
  event_id: string
  subject?: string | null
  name?: string | null
  apply_year?: string | null
  duration_minutes?: number | null
  start_time?: string | null
  end_time?: string | null
  venue_room?: string | null
  invigilator_names?: string | null
  capacity?: number | null
  allowed_items?: string | null
  special_instructions?: string | null
  attachment_path?: string | null
  sort_order?: number
}

/** Add an exam block to an event */
export async function addExamBlock(
  input: CreateExamBlockInput
): Promise<ActionResult<{ id: string }>> {
  const denied = await assertAccess(MODULES.EVENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data, error } = await supabase
      .from('event_exam_blocks')
      .insert(input)
      .select('id')
      .single()
    if (error) {
      console.error('Error adding exam block:', error)
      return { success: false, error: error.message }
    }
    revalidatePath('/events')
    return { success: true, data: { id: data.id } }
  } catch (err) {
    console.error('Error in addExamBlock:', err)
    return { success: false, error: 'Failed to add exam block' }
  }
}
