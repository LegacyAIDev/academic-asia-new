import { personName, type NamedPerson } from '@/lib/scheduler/person-name'
import type { EmailDirection } from './email-form'
import type { EmailSource } from './email-files'

/**
 * A filed email as the browser sees it. Storage paths never leave the server:
 * attachments are listed by name and fetched by their position in the list.
 */

export type EmailAttachmentInfo = { name: string; size: number; mime: string }
export type StoredAttachment = EmailAttachmentInfo & { path: string }

export type FiledEmailSummary = {
  id: string
  direction: EmailDirection
  source: EmailSource
  subject: string
  from: string
  to: string[]
  cc: string[]
  sentAt: string
  preview: string
  staffNote: string | null
  attachments: EmailAttachmentInfo[]
  fileName: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  createdByName: string
  updatedByName: string | null
  student: { id: string; name: string; code: string | null } | null
  school: { id: string; name: string } | null
  application: { id: string; label: string } | null
}

export type FiledEmailDetail = FiledEmailSummary & { bodyHtml: string | null; bodyText: string | null }

export const SUMMARY_SELECT = `
  id, direction, source, subject, from_name, from_address, to_addresses, cc_addresses, sent_at,
  body_preview, staff_note, attachments, file_name, archived_at, created_at, updated_at, updated_by,
  creator:profiles!filed_emails_created_by_fkey(first_name, surname),
  editor:profiles!filed_emails_updated_by_fkey(first_name, surname),
  student:students!filed_emails_student_id_fkey(id, first_name, surname, student_code),
  school:schools!filed_emails_school_id_fkey(id, name),
  application:student_applications!filed_emails_application_id_fkey(
    id, entry_year, school:schools!student_applications_school_id_fkey(name)
  )
`

export const DETAIL_SELECT = `${SUMMARY_SELECT}, body_html, body_text`

export type FiledEmailRow = {
  id: string
  direction: string
  source: string
  subject: string
  from_name: string | null
  from_address: string | null
  to_addresses: string[] | null
  cc_addresses: string[] | null
  sent_at: string
  body_preview: string | null
  staff_note: string | null
  attachments: unknown
  file_name: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
  creator: NamedPerson | null
  editor: NamedPerson | null
  student: (NamedPerson & { id: string; student_code: string | null }) | null
  school: { id: string; name: string | null } | null
  application: { id: string; entry_year: number | null; school: { name: string | null } | null } | null
  body_html?: string | null
  body_text?: string | null
}

/** The attachment list kept on the row, read defensively: anything malformed is skipped. */
export function storedAttachments(value: unknown): StoredAttachment[] {
  if (!Array.isArray(value)) return []
  return value.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const { name, size, mime, path } = item as Record<string, unknown>
    if (typeof name !== 'string' || typeof path !== 'string') return []
    return [{ name, path, size: typeof size === 'number' ? size : 0, mime: typeof mime === 'string' ? mime : '' }]
  })
}

/** "Headington School · 2027 entry", or the school alone when no entry year is set. */
export function applicationLabel(app: { entry_year: number | null; school: { name: string | null } | null }): string {
  const school = app.school?.name?.trim() || 'Application'
  return app.entry_year ? `${school} · ${app.entry_year} entry` : school
}

function sender(row: Pick<FiledEmailRow, 'from_name' | 'from_address'>): string {
  const name = row.from_name?.trim()
  const address = row.from_address?.trim()
  if (name && address) return `${name} <${address}>`
  return name || address || 'Unknown sender'
}

export function toFiledEmailSummary(row: FiledEmailRow): FiledEmailSummary {
  return {
    id: row.id,
    direction: row.direction === 'sent' ? 'sent' : 'received',
    source: (['eml', 'msg', 'pdf', 'manual'] as const).find(s => s === row.source) ?? 'manual',
    subject: row.subject,
    from: sender(row),
    to: row.to_addresses ?? [],
    cc: row.cc_addresses ?? [],
    sentAt: row.sent_at,
    preview: row.body_preview ?? '',
    staffNote: row.staff_note,
    attachments: storedAttachments(row.attachments).map(({ name, size, mime }) => ({ name, size, mime })),
    fileName: row.file_name,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByName: personName(row.creator) || 'Former staff',
    updatedByName: row.updated_by ? personName(row.editor) || 'Former staff' : null,
    student: row.student
      ? { id: row.student.id, name: personName(row.student) || 'Student', code: row.student.student_code }
      : null,
    school: row.school ? { id: row.school.id, name: row.school.name?.trim() || 'School' } : null,
    application: row.application ? { id: row.application.id, label: applicationLabel(row.application) } : null,
  }
}

export function toFiledEmailDetail(row: FiledEmailRow): FiledEmailDetail {
  return { ...toFiledEmailSummary(row), bodyHtml: row.body_html ?? null, bodyText: row.body_text ?? null }
}
