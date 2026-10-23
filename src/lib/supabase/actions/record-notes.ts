'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS } from '@/lib/permissions/modules'
import { noteBodySchema } from '@/lib/notes/note-format'
import { noteTarget } from '@/lib/notes/note-targets'
import { NOTE_SELECT, toRecordNote, type NoteRow, type RecordNote } from '@/lib/notes/record-note'
import { readRecordNotesPage } from '@/lib/supabase/queries/record-notes'
import { isUuid } from '@/lib/scheduler/uuid'
import type { ActionResult } from '@/lib/scheduler/action-helpers'

const UNKNOWN_TARGET = { success: false as const, error: 'Unknown kind of record' }
const SIGN_IN_AGAIN = { success: false as const, error: 'Please sign in again.' }

/**
 * Notes are written by their author and nobody else. The database default fills
 * author_id, so it is never sent from here; edits and deletes are narrowed to
 * the signed-in user and a note that matches nothing is reported as not theirs.
 */

function parseBody(body: string) {
  const parsed = noteBodySchema.safeParse(body)
  return parsed.success ? { body: parsed.data } : { error: parsed.error.issues[0]?.message ?? 'Invalid note' }
}

async function signedInUserId(supabase: ReturnType<typeof createClient>) {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

function refresh(config: NonNullable<ReturnType<typeof noteTarget>>) {
  const { path, type } = config.revalidate
  if (type) revalidatePath(path, type)
  else revalidatePath(path)
}

/** Newest notes of a record, for dialogs that open the list on demand. */
export async function listRecordNotes(
  target: string,
  recordId: string,
): Promise<ActionResult<{ notes: RecordNote[]; more: boolean }>> {
  const config = noteTarget(target)
  if (!config) return UNKNOWN_TARGET
  const denied = await assertAccess(config.module, ACCESS.READ)
  if (denied) return denied
  if (!isUuid(recordId)) return { success: false, error: 'Record not found' }

  try {
    const cookieStore = await cookies()
    const { page, error } = await readRecordNotesPage(createClient(cookieStore), config.column, recordId)
    if (!page) {
      console.error('Error listing record notes:', error)
      return { success: false, error: 'Could not load the notes.' }
    }
    return { success: true, data: page }
  } catch (err) {
    console.error('Error in listRecordNotes:', err)
    return { success: false, error: 'Could not load the notes.' }
  }
}

/** Adds a note to a record under the signed-in user's name. */
export async function addRecordNote(
  target: string,
  recordId: string,
  body: string,
): Promise<ActionResult<RecordNote>> {
  const config = noteTarget(target)
  if (!config) return UNKNOWN_TARGET
  const denied = await assertAccess(config.module, ACCESS.WRITE)
  if (denied) return denied
  if (!isUuid(recordId)) return { success: false, error: 'Record not found' }
  const parsed = parseBody(body)
  if ('error' in parsed) return { success: false, error: parsed.error }

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data, error } = await supabase
      .from('record_notes')
      .insert({ [config.column]: recordId, body: parsed.body })
      .select(NOTE_SELECT)
      .single()
    if (error) {
      console.error('Error adding record note:', error)
      return { success: false, error: 'Could not save the note.' }
    }
    refresh(config)
    return { success: true, data: toRecordNote(data as unknown as NoteRow) }
  } catch (err) {
    console.error('Error in addRecordNote:', err)
    return { success: false, error: 'Could not save the note.' }
  }
}

/** Changes the text of the signed-in user's own note. */
export async function updateRecordNote(
  target: string,
  noteId: string,
  body: string,
): Promise<ActionResult<RecordNote>> {
  const config = noteTarget(target)
  if (!config) return UNKNOWN_TARGET
  const denied = await assertAccess(config.module, ACCESS.WRITE)
  if (denied) return denied
  if (!isUuid(noteId)) return { success: false, error: 'Note not found' }
  const parsed = parseBody(body)
  if ('error' in parsed) return { success: false, error: parsed.error }

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const me = await signedInUserId(supabase)
    if (!me) return SIGN_IN_AGAIN

    const { data, error } = await supabase
      .from('record_notes')
      .update({ body: parsed.body })
      .eq('id', noteId)
      .eq('author_id', me)
      .not(config.column, 'is', null)
      .select(NOTE_SELECT)
      .maybeSingle()
    if (error) {
      console.error('Error updating record note:', error)
      return { success: false, error: 'Could not save the note.' }
    }
    if (!data) return { success: false, error: 'You can only edit your own notes.' }
    refresh(config)
    return { success: true, data: toRecordNote(data as unknown as NoteRow) }
  } catch (err) {
    console.error('Error in updateRecordNote:', err)
    return { success: false, error: 'Could not save the note.' }
  }
}

/** Deletes the signed-in user's own note. */
export async function deleteRecordNote(target: string, noteId: string): Promise<ActionResult> {
  const config = noteTarget(target)
  if (!config) return UNKNOWN_TARGET
  const denied = await assertAccess(config.module, ACCESS.WRITE)
  if (denied) return denied
  if (!isUuid(noteId)) return { success: false, error: 'Note not found' }

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const me = await signedInUserId(supabase)
    if (!me) return SIGN_IN_AGAIN

    const { data, error } = await supabase
      .from('record_notes')
      .delete()
      .eq('id', noteId)
      .eq('author_id', me)
      .not(config.column, 'is', null)
      .select('id')
    if (error) {
      console.error('Error deleting record note:', error)
      return { success: false, error: 'Could not delete the note.' }
    }
    if (!data || data.length === 0) return { success: false, error: 'You can only delete your own notes.' }
    refresh(config)
    return { success: true }
  } catch (err) {
    console.error('Error in deleteRecordNote:', err)
    return { success: false, error: 'Could not delete the note.' }
  }
}
