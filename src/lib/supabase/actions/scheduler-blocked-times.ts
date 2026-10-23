'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { addDays } from 'date-fns'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import type { ActionResult } from '@/lib/scheduler/action-helpers'
import { blockedTimeSchema, findBlockClashes, type BlockClash, type BlockedTimeInput } from '@/lib/scheduler/blocked-times'
import { MAX_RANGE_DAYS } from '@/lib/scheduler/config'
import { mapSchedulerError } from '@/lib/scheduler/error-messages'
import { todayInBusinessTz } from '@/lib/scheduler/search-params'
import { getBlockedTimeOccurrences, getRoomItemsInRange } from '@/lib/supabase/queries/scheduler-blocked-times'

/**
 * Whose block it is. A person's block is always the signed-in user's own; the
 * client never says whose. A room's block belongs to the room manager flow.
 */
export type BlockedTimeSubject = { kind: 'profile' } | { kind: 'room'; roomId: string }

export type SavedBlockedTime = { id: string; clashes: BlockClash[] }

const subjectSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('profile') }),
  z.object({ kind: z.literal('room'), roomId: z.string().uuid() }),
])

/**
 * Own calendar needs Scheduler edit access; rooms are managed by whoever manages
 * rooms. Runs before the subject is validated, so it must not trust its shape.
 */
function moduleFor(subject: BlockedTimeSubject | null | undefined) {
  return subject?.kind === 'room' ? MODULES.EXAMS : MODULES.SCHEDULER
}

type Supabase = ReturnType<typeof createClient>
type SubjectScoped<Q> = { query: Q } | { error: string }

/**
 * Narrows an update or delete to rows the caller may touch: the given room's
 * blocks, or the signed-in user's own blocks. Anything else matches no row.
 */
async function scopeToSubject<Q extends { eq: (column: string, value: string) => Q }>(
  query: Q,
  subject: z.infer<typeof subjectSchema>,
  supabase: Supabase,
): Promise<SubjectScoped<Q>> {
  if (subject.kind === 'room') return { query: query.eq('room_id', subject.roomId) }
  const me = await currentUserId(supabase)
  return me ? { query: query.eq('profile_id', me) } : { error: 'Please sign in again.' }
}

function revalidateBlockPaths() {
  revalidatePath('/scheduler')
  revalidatePath('/scheduler/rooms')
}

/** Id of the signed-in user, or null when the session is gone. */
async function currentUserId(supabase: Supabase): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

/**
 * Bookings in the room over the next stretch of days that the saved block now
 * covers. Nothing is cancelled: staff are told so they can move them.
 */
async function clashesForRoomBlock(roomId: string, blockId: string): Promise<BlockClash[]> {
  const from = todayInBusinessTz()
  const to = addDays(new Date(`${from}T00:00:00Z`), MAX_RANGE_DAYS).toISOString().slice(0, 10)
  const [occurrences, items] = await Promise.all([
    getBlockedTimeOccurrences({ from, to, roomIds: [roomId] }),
    getRoomItemsInRange(roomId, from, to),
  ])
  const own = occurrences.filter(occurrence => occurrence.blockedTimeId === blockId)
  return findBlockClashes(own, items)
}

export async function createBlockedTime(
  subjectInput: BlockedTimeSubject,
  input: BlockedTimeInput,
): Promise<ActionResult<SavedBlockedTime>> {
  const denied = await assertAccess(moduleFor(subjectInput), ACCESS.WRITE)
  if (denied) return denied

  const subject = subjectSchema.safeParse(subjectInput)
  if (!subject.success) return { success: false, error: 'Invalid room' }
  const parsed = blockedTimeSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid blocked time' }

  try {
    const supabase = createClient(await cookies())
    const owner = subject.data.kind === 'room' ? { room_id: subject.data.roomId } : { profile_id: await currentUserId(supabase) }
    if (subject.data.kind === 'profile' && !owner.profile_id) return { success: false, error: 'Please sign in again.' }

    const { data, error } = await supabase
      .from('scheduler_blocked_times')
      .insert({ ...parsed.data, ...owner })
      .select('id')
      .single()
    if (error) return { success: false, error: mapSchedulerError(error, 'Could not save the blocked time') }

    revalidateBlockPaths()
    const clashes = subject.data.kind === 'room' ? await clashesForRoomBlock(subject.data.roomId, data.id) : []
    return { success: true, data: { id: data.id, clashes } }
  } catch (error) {
    console.error('createBlockedTime failed:', error)
    return { success: false, error: 'Could not save the blocked time' }
  }
}

export async function updateBlockedTime(
  id: string,
  subjectInput: BlockedTimeSubject,
  input: BlockedTimeInput,
): Promise<ActionResult<SavedBlockedTime>> {
  const denied = await assertAccess(moduleFor(subjectInput), ACCESS.WRITE)
  if (denied) return denied

  const subject = subjectSchema.safeParse(subjectInput)
  if (!subject.success || !z.string().uuid().safeParse(id).success) return { success: false, error: 'Blocked time not found' }
  const parsed = blockedTimeSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid blocked time' }

  try {
    const supabase = createClient(await cookies())
    const scoped = await scopeToSubject(
      supabase.from('scheduler_blocked_times').update(parsed.data).eq('id', id), subject.data, supabase,
    )
    if ('error' in scoped) return { success: false, error: scoped.error }

    const { data, error } = await scoped.query.select('id')
    if (error) return { success: false, error: mapSchedulerError(error, 'Could not save the blocked time') }
    if (!data?.length) return { success: false, error: 'Blocked time not found' }

    revalidateBlockPaths()
    const clashes = subject.data.kind === 'room' ? await clashesForRoomBlock(subject.data.roomId, id) : []
    return { success: true, data: { id, clashes } }
  } catch (error) {
    console.error('updateBlockedTime failed:', error)
    return { success: false, error: 'Could not save the blocked time' }
  }
}

export async function deleteBlockedTime(id: string, subjectInput: BlockedTimeSubject): Promise<ActionResult> {
  const denied = await assertAccess(moduleFor(subjectInput), ACCESS.WRITE)
  if (denied) return denied

  const subject = subjectSchema.safeParse(subjectInput)
  if (!subject.success || !z.string().uuid().safeParse(id).success) return { success: false, error: 'Blocked time not found' }

  try {
    const supabase = createClient(await cookies())
    const scoped = await scopeToSubject(
      supabase.from('scheduler_blocked_times').delete().eq('id', id), subject.data, supabase,
    )
    if ('error' in scoped) return { success: false, error: scoped.error }

    const { data, error } = await scoped.query.select('id')
    if (error) return { success: false, error: mapSchedulerError(error, 'Could not delete the blocked time') }
    if (!data?.length) return { success: false, error: 'Blocked time not found' }

    revalidateBlockPaths()
    return { success: true }
  } catch (error) {
    console.error('deleteBlockedTime failed:', error)
    return { success: false, error: 'Could not delete the blocked time' }
  }
}
