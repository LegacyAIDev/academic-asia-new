'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { isUuid } from '@/lib/scheduler/uuid'
import type { ActionResult } from '@/lib/scheduler/action-helpers'

/** Text of the imported log book of one student, loaded on request. */
export async function loadStudentLegacyLog(studentId: string): Promise<ActionResult<{ text: string }>> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.READ)
  if (denied) return denied
  if (!isUuid(studentId)) return { success: false, error: 'Student not found' }

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('student_log_book')
      .select('remarks')
      .eq('student_id', studentId)
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error loading student log book:', error)
      return { success: false, error: 'Could not load the old log book.' }
    }
    return { success: true, data: { text: data?.remarks ?? '' } }
  } catch (err) {
    console.error('Error in loadStudentLegacyLog:', err)
    return { success: false, error: 'Could not load the old log book.' }
  }
}
