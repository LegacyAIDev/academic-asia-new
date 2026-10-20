import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { personName } from '@/lib/scheduler/person-name'

/** One recorded change of an application's status and/or sub-status, with labels resolved. */
export type ApplicationStatusChange = {
  id: number
  changed_at: string
  from_status_id: number | null
  to_status_id: number | null
  from_sub_status_id: number | null
  to_sub_status_id: number | null
  from_status: string | null
  to_status: string | null
  from_sub_status: string | null
  to_sub_status: string | null
  changed_by_name: string | null
}

type Label = { label: string } | null

type HistoryRow = Omit<ApplicationStatusChange, 'from_status' | 'to_status' | 'from_sub_status' | 'to_sub_status' | 'changed_by_name'> & {
  from_status: Label
  to_status: Label
  from_sub_status: Label
  to_sub_status: Label
  changed_by: { first_name: string | null; surname: string | null } | null
}

const HISTORY_SELECT = `id, changed_at, from_status_id, to_status_id, from_sub_status_id, to_sub_status_id,
  from_status:application_statuses!student_application_status_history_from_status_id_fkey(label),
  to_status:application_statuses!student_application_status_history_to_status_id_fkey(label),
  from_sub_status:application_sub_statuses!student_application_status_history_from_sub_status_id_fkey(label),
  to_sub_status:application_sub_statuses!student_application_status_history_to_sub_status_id_fkey(label),
  changed_by:profiles!student_application_status_history_changed_by_fkey(first_name, surname)`

/** Upper bound for one page; an application changes status a handful of times in its life. */
const MAX_CHANGES = 100

/**
 * Status changes of one application, newest first. Written by a database
 * trigger since 2026-10-20; earlier changes were never recorded. Callers must
 * already have checked access to the application itself.
 */
export async function getApplicationStatusHistory(applicationId: string): Promise<ApplicationStatusChange[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('student_application_status_history')
    .select(HISTORY_SELECT)
    .eq('application_id', applicationId)
    .order('changed_at', { ascending: false })
    // Changes made in one transaction share changed_at; the id keeps their order.
    .order('id', { ascending: false })
    .limit(MAX_CHANGES)

  if (error) {
    console.error('Error fetching application status history:', error)
    return []
  }

  return ((data ?? []) as unknown as HistoryRow[]).map(row => ({
    id: row.id,
    changed_at: row.changed_at,
    from_status_id: row.from_status_id,
    to_status_id: row.to_status_id,
    from_sub_status_id: row.from_sub_status_id,
    to_sub_status_id: row.to_sub_status_id,
    from_status: row.from_status?.label ?? null,
    to_status: row.to_status?.label ?? null,
    from_sub_status: row.from_sub_status?.label ?? null,
    to_sub_status: row.to_sub_status?.label ?? null,
    changed_by_name: personName(row.changed_by) || null,
  }))
}
