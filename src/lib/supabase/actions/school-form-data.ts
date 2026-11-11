'use server'

import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { getSchoolById, getSchoolReferenceData } from '@/lib/supabase/queries/schools'

/**
 * What the school drawer needs, loaded when it opens: the dropdown choices and,
 * when editing, the school as it is now.
 */
export async function loadSchoolForm(schoolId?: string) {
  const denied = await assertAccess(MODULES.SCHOOLS, ACCESS.WRITE)
  if (denied) return denied
  const [school, referenceData] = await Promise.all([
    schoolId ? getSchoolById(schoolId) : Promise.resolve(null),
    getSchoolReferenceData(),
  ])
  if (schoolId && !school) return { success: false as const, error: 'This school no longer exists.' }
  return { success: true as const, data: { school, referenceData } }
}
