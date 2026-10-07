'use server'

import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import {
  getStudentApplications,
  searchStudents,
  type SchedulerStudentApplication,
  type SchedulerStudentOption,
} from '@/lib/supabase/queries/scheduler-people'

export type ActionResult<T = void> = { success: boolean; data?: T; error?: string }

/** Student lookup for the booking dialog's attendee/candidate search. */
export async function searchStudentsAction(q: string): Promise<ActionResult<SchedulerStudentOption[]>> {
  const denied = await assertAccess(MODULES.SCHEDULER, ACCESS.READ)
  if (denied) return denied

  try {
    return { success: true, data: await searchStudents(q) }
  } catch (error) {
    console.error('searchStudentsAction failed:', error)
    return { success: false, error: 'Failed to search students' }
  }
}

/** A student's applications, for linking a booking to one of them. */
export async function getStudentApplicationsAction(studentId: string): Promise<ActionResult<SchedulerStudentApplication[]>> {
  const denied = await assertAccess(MODULES.SCHEDULER, ACCESS.READ)
  if (denied) return denied

  try {
    return { success: true, data: await getStudentApplications(studentId) }
  } catch (error) {
    console.error('getStudentApplicationsAction failed:', error)
    return { success: false, error: 'Failed to load applications' }
  }
}
