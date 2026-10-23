import { personName, type NamedPerson } from '@/lib/scheduler/person-name'

/** Columns read for a note, with the author's name joined in. */
export const NOTE_SELECT =
  'id, body, created_at, updated_at, author_id, author:profiles!record_notes_author_id_fkey(first_name, surname)'

/** Most notes loaded for one record; older ones stay in the database. */
export const NOTE_LIMIT = 200

export type RecordNote = {
  id: string
  body: string
  createdAt: string
  updatedAt: string
  /** Null once the author's account is gone. */
  authorId: string | null
  authorName: string | null
}

export type NoteRow = {
  id: string
  body: string
  created_at: string
  updated_at: string
  author_id: string | null
  author: NamedPerson | null
}

export function toRecordNote(row: NoteRow): RecordNote {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    authorId: row.author_id,
    authorName: personName(row.author) || null,
  }
}
