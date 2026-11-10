'use server'

import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { searchSchoolOptions } from '@/lib/supabase/queries/filed-emails'

type ActionResult<T> = { success: boolean; data?: T; error?: string }

/** Schools whose name contains the search, for pickers on student records (two characters or more). */
export async function searchSchoolsAction(query: string): Promise<ActionResult<{ id: string; name: string }[]>> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.READ)
  if (denied) return denied
  if (typeof query !== 'string') return { success: false, error: 'Invalid search' }
  try {
    return { success: true, data: await searchSchoolOptions(query) }
  } catch (err) {
    console.error('Error in searchSchoolsAction:', err)
    return { success: false, error: 'Failed to search schools' }
  }
}
