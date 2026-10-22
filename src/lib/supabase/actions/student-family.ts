'use server'

import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { searchStudentsForFamily, type LinkedStudent } from '@/lib/supabase/queries/student-family'
import type { ActionResult } from '@/lib/supabase/actions/students'

/** The family member picker's search, run as staff type. Seeing students is enough to search them. */
export async function searchStudentsForFamilyAction(query: string, excludeId: string): Promise<ActionResult<LinkedStudent[]>> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.READ)
  if (denied) return denied

  if (typeof query !== 'string' || typeof excludeId !== 'string') return { success: false, error: 'Invalid search' }
  try {
    return { success: true, data: await searchStudentsForFamily(query, excludeId) }
  } catch (err) {
    console.error('Error in searchStudentsForFamilyAction:', err)
    return { success: false, error: 'Failed to search students' }
  }
}
