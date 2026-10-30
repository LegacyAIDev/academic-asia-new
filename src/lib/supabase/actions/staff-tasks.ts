'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { isUuid } from '@/lib/scheduler/uuid'
import { TASK_SELECT, taskColumns, taskInputSchema, toStaffTask, type StaffTask, type TaskRow } from '@/lib/tasks/task-rules'
import type { ActionResult } from '@/lib/scheduler/action-helpers'

/**
 * The task planner (meeting note 2). Every signed-in staff member has one,
 * like the Dashboard it sits beside, so the guard is Dashboard read. Each
 * task belongs to its owner: the database sets owner_id and its policies
 * refuse any other user's rows; the actions narrow by owner as well, so a
 * task id from someone else simply matches nothing.
 */

const NOT_FOUND = { success: false as const, error: 'Task not found' }
const FAILED = { success: false as const, error: 'Could not save the task. Please try again.' }
const SIGN_IN_AGAIN = { success: false as const, error: 'Please sign in again.' }

type Supabase = ReturnType<typeof createClient>

async function signedIn(): Promise<{ supabase: Supabase; userId: string } | null> {
  const supabase = createClient(await cookies())
  const { data } = await supabase.auth.getUser()
  return data.user ? { supabase, userId: data.user.id } : null
}

function parse(input: unknown) {
  const parsed = taskInputSchema.safeParse(input)
  return parsed.success ? { data: parsed.data } : { error: parsed.error.issues[0]?.message ?? 'Check the task' }
}

export async function createTask(input: unknown): Promise<ActionResult<StaffTask>> {
  const denied = await assertAccess(MODULES.DASHBOARD, ACCESS.READ)
  if (denied) return denied
  const parsed = parse(input)
  if ('error' in parsed) return { success: false, error: parsed.error }
  try {
    const session = await signedIn()
    if (!session) return SIGN_IN_AGAIN
    const { data, error } = await session.supabase
      .from('staff_tasks')
      .insert({ ...taskColumns(parsed.data), owner_id: session.userId })
      .select(TASK_SELECT)
      .single()
    if (error || !data) {
      console.error('Error creating a task:', error?.message)
      return FAILED
    }
    revalidatePath('/tasks')
    return { success: true, data: toStaffTask(data as TaskRow) }
  } catch (err) {
    console.error('Error in createTask:', err)
    return FAILED
  }
}

export async function updateTask(id: string, input: unknown): Promise<ActionResult<StaffTask>> {
  const denied = await assertAccess(MODULES.DASHBOARD, ACCESS.READ)
  if (denied) return denied
  if (!isUuid(String(id))) return NOT_FOUND
  const parsed = parse(input)
  if ('error' in parsed) return { success: false, error: parsed.error }
  return write(id, taskColumns(parsed.data))
}

/** Ticks a task off, or puts it back on the active list. */
export async function setTaskCompleted(id: string, completed: boolean): Promise<ActionResult<StaffTask>> {
  const denied = await assertAccess(MODULES.DASHBOARD, ACCESS.READ)
  if (denied) return denied
  if (!isUuid(String(id))) return NOT_FOUND
  return write(id, { completed_at: completed ? new Date().toISOString() : null })
}

async function write(id: string, change: Record<string, unknown>): Promise<ActionResult<StaffTask>> {
  try {
    const session = await signedIn()
    if (!session) return SIGN_IN_AGAIN
    const { data, error } = await session.supabase
      .from('staff_tasks')
      .update(change)
      .eq('id', id)
      .eq('owner_id', session.userId)
      .select(TASK_SELECT)
      .maybeSingle()
    if (error) {
      console.error('Error updating a task:', error.message)
      return FAILED
    }
    if (!data) return NOT_FOUND
    revalidatePath('/tasks')
    return { success: true, data: toStaffTask(data as TaskRow) }
  } catch (err) {
    console.error('Error updating a task:', err)
    return FAILED
  }
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.DASHBOARD, ACCESS.READ)
  if (denied) return denied
  if (!isUuid(String(id))) return NOT_FOUND
  try {
    const session = await signedIn()
    if (!session) return SIGN_IN_AGAIN
    const { data, error } = await session.supabase
      .from('staff_tasks').delete().eq('id', id).eq('owner_id', session.userId).select('id')
    if (error) {
      console.error('Error deleting a task:', error.message)
      return { success: false, error: 'Could not delete the task.' }
    }
    if (!data?.length) return NOT_FOUND
    revalidatePath('/tasks')
    return { success: true }
  } catch (err) {
    console.error('Error in deleteTask:', err)
    return { success: false, error: 'Could not delete the task.' }
  }
}

/** Removes every completed task of the signed-in user. */
export async function clearCompletedTasks(): Promise<ActionResult<{ removed: number }>> {
  const denied = await assertAccess(MODULES.DASHBOARD, ACCESS.READ)
  if (denied) return denied
  try {
    const session = await signedIn()
    if (!session) return SIGN_IN_AGAIN
    const { data, error } = await session.supabase
      .from('staff_tasks').delete().eq('owner_id', session.userId).not('completed_at', 'is', null).select('id')
    if (error) {
      console.error('Error clearing completed tasks:', error.message)
      return { success: false, error: 'Could not clear the completed tasks.' }
    }
    revalidatePath('/tasks')
    return { success: true, data: { removed: data?.length ?? 0 } }
  } catch (err) {
    console.error('Error in clearCompletedTasks:', err)
    return { success: false, error: 'Could not clear the completed tasks.' }
  }
}
