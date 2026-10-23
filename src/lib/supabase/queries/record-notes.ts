import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { noteTarget } from '@/lib/notes/note-targets'
import { NOTE_LIMIT, NOTE_SELECT, toRecordNote, type NoteRow, type RecordNote } from '@/lib/notes/record-note'

export type RecordNotesPage = { notes: RecordNote[]; more: boolean }

type NoteColumn = NonNullable<ReturnType<typeof noteTarget>>['column']

/**
 * Newest notes of one record, shared by the page loader and the dialog action.
 * One extra row is asked for so the list can say "Showing newest 200" without
 * a second count query. Callers decide what a database error means for them.
 */
export async function readRecordNotesPage(
  supabase: ReturnType<typeof createClient>,
  column: NoteColumn,
  recordId: string,
): Promise<{ page: RecordNotesPage; error: null } | { page: null; error: unknown }> {
  const { data, error } = await supabase
    .from('record_notes')
    .select(NOTE_SELECT)
    .eq(column, recordId)
    .order('created_at', { ascending: false })
    .limit(NOTE_LIMIT + 1)
  if (error) return { page: null, error }

  const rows = (data ?? []) as unknown as NoteRow[]
  return { page: { notes: rows.slice(0, NOTE_LIMIT).map(toRecordNote), more: rows.length > NOTE_LIMIT }, error: null }
}

/** Notes for a server-rendered page. Empty on error: a failed notes list must not take the whole page down. */
export async function getRecordNotes(target: string, recordId: string): Promise<RecordNotesPage> {
  const config = noteTarget(target)
  if (!config) return { notes: [], more: false }

  const cookieStore = await cookies()
  const { page, error } = await readRecordNotesPage(createClient(cookieStore), config.column, recordId)
  if (!page) console.error('Error fetching record notes:', error)
  return page ?? { notes: [], more: false }
}

/** Id of the signed-in user, used to decide whose notes may be edited. */
export async function getSignedInUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}
