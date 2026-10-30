'use server'

import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { isUuid } from '@/lib/scheduler/uuid'
import { searchFiledEmailBodies, type EmailListTarget } from '@/lib/supabase/queries/filed-emails'
import type { ActionResult } from '@/lib/scheduler/action-helpers'

type SearchTarget = { kind: 'student' | 'school' | 'application'; id: string }

/**
 * Full-text search of a record's emails (EF-16). The list in the browser only
 * carries the first part of each body, so the Communications search asks the
 * server which emails mention the words further down.
 */
export async function searchEmailBodies(target: SearchTarget, query: string): Promise<ActionResult<string[]>> {
  const denied = await assertAccess(target?.kind === 'school' ? MODULES.SCHOOLS : MODULES.STUDENTS, ACCESS.READ)
  if (denied) return denied
  if (!target || !isUuid(String(target.id)) || typeof query !== 'string') return { success: false, error: 'Invalid search' }
  if (!['student', 'school', 'application'].includes(target.kind)) return { success: false, error: 'Invalid search' }

  const where: EmailListTarget = target.kind === 'student' ? { studentId: target.id }
    : target.kind === 'school' ? { schoolId: target.id } : { applicationId: target.id }
  try {
    return { success: true, data: await searchFiledEmailBodies(where, query) }
  } catch (err) {
    console.error('Error in searchEmailBodies:', err)
    return { success: false, error: 'Search failed' }
  }
}
