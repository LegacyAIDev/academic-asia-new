import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ACTIVITY_SELECT, hiddenActivityKinds, toActivityEntry, type ActivityEntry, type ActivityRow } from '@/lib/activity/activity-format'
import { canAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { EXAM_PAPER_ACCESS } from '@/lib/attachments/exam-paper-access'

/** Newest entries shown on a record; older history stays stored. */
export const MAX_ACTIVITY = 200

export type ActivityTarget = { studentId: string } | { schoolId: string } | { applicationId: string }

const COLUMN = { studentId: 'student_id', schoolId: 'school_id', applicationId: 'application_id' } as const

/**
 * A record's activity history, newest first. Pages call this after their own
 * requireAccess; kinds the viewer may not see (exam papers, bookings) are left
 * out here. Null when it could not be read, so the card can say so.
 */
export async function getActivity(target: ActivityTarget): Promise<ActivityEntry[] | null> {
  const [key, id] = Object.entries(target)[0] as [keyof typeof COLUMN, string]
  const [examPapers, scheduler] = await Promise.all([
    canAccess(EXAM_PAPER_ACCESS.module, EXAM_PAPER_ACCESS.read),
    canAccess(MODULES.SCHEDULER, ACCESS.READ),
  ])
  const hidden = hiddenActivityKinds({ examPapers, scheduler })
  const supabase = createClient(await cookies())
  let query = supabase
    .from('activity_log')
    .select(ACTIVITY_SELECT)
    .eq(COLUMN[key], id)
  if (hidden.length) query = query.not('entity', 'in', `(${hidden.join(',')})`)
  const { data, error } = await query
    .order('occurred_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(MAX_ACTIVITY)
  if (error) {
    console.error('Error loading activity:', error.message)
    return null
  }
  return (data as unknown as ActivityRow[]).map(toActivityEntry)
}
