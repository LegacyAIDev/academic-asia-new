import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { TASK_SELECT, toStaffTask, type StaffTask, type TaskRow } from '@/lib/tasks/task-rules'

/** Completed tasks kept on the page; older ones stay stored but out of sight. */
export const MAX_COMPLETED_SHOWN = 100

/**
 * The signed-in user's tasks. Row-level security returns only their own rows;
 * the owner filter is repeated so the intent is plain and the index is used.
 * Null when the list could not be read, so the page can say so.
 */
export async function getMyTasks(): Promise<{ active: StaffTask[]; completed: StaffTask[] } | null> {
  const supabase = createClient(await cookies())
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null

  const [active, completed] = await Promise.all([
    supabase.from('staff_tasks').select(TASK_SELECT).eq('owner_id', auth.user.id).is('completed_at', null).limit(500),
    supabase.from('staff_tasks').select(TASK_SELECT).eq('owner_id', auth.user.id).not('completed_at', 'is', null)
      .order('completed_at', { ascending: false }).limit(MAX_COMPLETED_SHOWN),
  ])
  if (active.error || completed.error) {
    console.error('Error loading tasks:', active.error?.message ?? completed.error?.message)
    return null
  }
  return {
    active: (active.data as TaskRow[]).map(toStaffTask),
    completed: (completed.data as TaskRow[]).map(toStaffTask),
  }
}
