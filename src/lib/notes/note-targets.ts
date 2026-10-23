import { MODULES, type ModuleKey } from '@/lib/permissions/modules'

/**
 * Every kind of record that can carry dated notes. The UI passes one key; the
 * server action looks up the column, the permission module and the page to
 * refresh from here, so a typo is a compile error instead of a note filed under
 * the wrong parent.
 *
 * `column` must be one of the parent columns of record_notes from
 * supabase/migrations/20261023193522_record_notes_and_school_note_authors.sql;
 * note-targets.test.ts checks that against the SQL.
 */
export const NOTE_TARGETS = {
  student: {
    column: 'student_id',
    module: MODULES.STUDENTS,
    label: 'student',
    revalidate: { path: '/students/[id]', type: 'page' },
  },
  application: {
    column: 'application_id',
    module: MODULES.STUDENTS,
    label: 'application',
    revalidate: { path: '/students/[id]/applications/[applicationId]', type: 'page' },
  },
  exam: {
    column: 'exam_id',
    module: MODULES.EXAMS,
    label: 'exam',
    revalidate: { path: '/exams' },
  },
} as const satisfies Record<string, NoteTargetConfig>

type NoteTargetConfig = {
  column: 'student_id' | 'application_id' | 'exam_id'
  module: ModuleKey
  label: string
  revalidate: { path: string; type?: 'page' | 'layout' }
}

export type NoteTargetKey = keyof typeof NOTE_TARGETS

const BY_KEY = new Map<string, NoteTargetConfig>(Object.entries(NOTE_TARGETS))

/**
 * Looks a key up from untrusted input. A Map is used so keys such as
 * "constructor" or "__proto__" find nothing instead of an inherited property.
 */
export function noteTarget(key: unknown): NoteTargetConfig | undefined {
  return typeof key === 'string' ? BY_KEY.get(key) : undefined
}
