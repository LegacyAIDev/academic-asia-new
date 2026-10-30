import { personName, type NamedPerson } from '@/lib/scheduler/person-name'

/**
 * Words for the activity history (meeting note 18). The database stores the
 * table and the changed column names; this turns them into "Updated
 * application: status, sub-status" for staff. Pure and tested.
 */

export type ActivityEntry = {
  id: number
  occurredAt: string
  actorName: string
  action: 'created' | 'updated' | 'deleted'
  entity: string
  label: string | null
  changed: string[]
}

const ENTITY_NAMES: Record<string, string> = {
  students: 'student record',
  student_applications: 'application',
  student_individual_exams: 'exam',
  student_contacts: 'family member',
  student_documents: 'document',
  scheduler_bookings: 'booking',
  scheduler_booking_attendees: 'booking attendee',
  filed_emails: 'email',
  schools: 'school record',
  school_contacts: 'school contact',
  school_documents: 'school document',
  school_exam_papers: 'exam paper',
  school_entrance_exams: 'entrance assessment',
}

/** Column names staff would not recognise, in their words; anything else is spelt out from the column. */
const FIELD_NAMES: Record<string, string> = {
  status_id: 'status',
  sub_status_id: 'sub-status',
  status: 'status',
  archived_at: 'archived',
  archived_by: 'archived',
  completed_at: 'completed',
  confirmed_at: 'confirmed',
  confirmed_by: 'confirmed',
  start_at: 'start time',
  end_at: 'end time',
  room_id: 'room',
  seat_no: 'seat',
  school_id: 'school',
  student_id: 'student',
  application_id: 'application',
  exam_id: 'exam',
  assigned_to: 'consultant',
  present_school_id: 'current school',
  related_student_id: 'linked student',
  sent_at: 'date',
  file_path: 'file',
  is_active: 'active',
  is_archived: 'archived',
  entry_year: 'entry year',
  year_group: 'year group',
  assessment_snapshot: 'papers',
  cancel_reason: 'cancellation reason',
  attendance: 'attendance',
}

/**
 * Kinds of activity a viewer may not see even though they can see the record:
 * exam papers are the examination team's (EXAM_PAPER_ACCESS), bookings need
 * the Scheduler. The record page's own module check covers everything else.
 */
export function hiddenActivityKinds(rights: { examPapers: boolean; scheduler: boolean }): string[] {
  return [
    ...(rights.examPapers ? [] : ['school_exam_papers']),
    ...(rights.scheduler ? [] : ['scheduler_bookings', 'scheduler_booking_attendees']),
  ]
}

export function entityName(entity: string): string {
  return ENTITY_NAMES[entity] ?? entity.replace(/_/g, ' ').replace(/s$/, '')
}

export function fieldName(column: string): string {
  return FIELD_NAMES[column] ?? column.replace(/_id$/, '').replace(/_/g, ' ')
}

const VERB = { created: 'Created', updated: 'Updated', deleted: 'Deleted' } as const

/** "Updated application: status, sub-status" — at most four fields, then "and 2 more". */
export function describeActivity(entry: Pick<ActivityEntry, 'action' | 'entity' | 'changed'>): string {
  const what = `${VERB[entry.action]} ${entityName(entry.entity)}`
  if (entry.action !== 'updated' || entry.changed.length === 0) return what
  const fields = [...new Set(entry.changed.map(fieldName))]
  const shown = fields.slice(0, 4).join(', ')
  return `${what}: ${shown}${fields.length > 4 ? ` and ${fields.length - 4} more` : ''}`
}

export type ActivityRow = {
  id: number
  occurred_at: string
  action: string
  entity: string
  label: string | null
  changed: string[] | null
  actor_id: string | null
  actor: NamedPerson | null
}

export const ACTIVITY_SELECT = 'id, occurred_at, action, entity, label, changed, actor_id, actor:profiles!activity_log_actor_id_fkey(first_name, surname)'

export function toActivityEntry(row: ActivityRow): ActivityEntry {
  return {
    id: row.id,
    occurredAt: row.occurred_at,
    // No actor: written without a signed-in user (import or maintenance). A removed account keeps "Former staff".
    actorName: row.actor_id ? personName(row.actor) || 'Former staff' : 'System',
    action: row.action === 'created' || row.action === 'deleted' ? row.action : 'updated',
    entity: row.entity,
    label: row.label,
    changed: row.changed ?? [],
  }
}
