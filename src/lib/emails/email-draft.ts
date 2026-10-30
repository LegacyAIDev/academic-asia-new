import {
  formatAddress, formatAddressList, fromHkLocalInput, guessDirection, toHkLocalInput, type EmailDirection,
} from './email-form'
import type { ParsedEmail } from './parse-email'
import type { FiledEmailSummary } from './filed-email'
import { emailDetailsSchema, emailLinksSchema } from './email-schema'

/**
 * What the email form holds while staff edit it, and how it maps to and from a
 * parsed file, a saved email and the action input. Pure, so the mapping is
 * tested without rendering the dialogs.
 */

export type EmailDraft = {
  direction: EmailDirection
  subject: string
  /** Hong Kong local "YYYY-MM-DDTHH:mm" for a datetime-local input. */
  sentAtLocal: string
  from: string
  to: string
  cc: string
  staffNote: string
}

export type LinkedRecord = { id: string; name: string }

export type LinkDraft = { student: LinkedRecord | null; school: LinkedRecord | null; applicationId: string | null }

/** Where the email is being filed from, which also decides the default links. */
export type EmailContext =
  | { kind: 'student'; student: LinkedRecord }
  | { kind: 'school'; school: LinkedRecord }
  | { kind: 'application'; student: LinkedRecord; school: LinkedRecord; applicationId: string }

export function emptyDraft(now: Date = new Date()): EmailDraft {
  return {
    direction: 'received', subject: '', sentAtLocal: toHkLocalInput(now.toISOString()),
    from: '', to: '', cc: '', staffNote: '',
  }
}

/** Pre-fills the form from a parsed .eml or .msg file (EF-05, EF-06). */
export function draftFromParsed(parsed: ParsedEmail, now: Date = new Date()): EmailDraft {
  return {
    direction: guessDirection(parsed.from),
    subject: parsed.subject || '(no subject)',
    sentAtLocal: toHkLocalInput(parsed.sentAt ?? now.toISOString()),
    from: parsed.from ? formatAddress(parsed.from) : '',
    to: formatAddressList(parsed.to),
    cc: formatAddressList(parsed.cc),
    staffNote: '',
  }
}

export function draftFromEmail(email: FiledEmailSummary): EmailDraft {
  return {
    direction: email.direction,
    subject: email.subject,
    sentAtLocal: toHkLocalInput(email.sentAt),
    from: email.from === 'Unknown sender' ? '' : email.from,
    to: email.to.join('; '),
    cc: email.cc.join('; '),
    staffNote: email.staffNote ?? '',
  }
}

/** The details object the server actions validate; an impossible date becomes empty so the schema names it. */
export function detailsInput(draft: EmailDraft) {
  return {
    direction: draft.direction,
    subject: draft.subject,
    sentAt: fromHkLocalInput(draft.sentAtLocal) ?? '',
    from: draft.from,
    to: draft.to,
    cc: draft.cc,
    staffNote: draft.staffNote,
  }
}

export function linksFromContext(context: EmailContext): LinkDraft {
  if (context.kind === 'student') return { student: context.student, school: null, applicationId: null }
  if (context.kind === 'school') return { student: null, school: context.school, applicationId: null }
  // From an application page the email belongs to the student, that application and its school (D4).
  return { student: context.student, school: context.school, applicationId: context.applicationId }
}

export function linksFromEmail(email: FiledEmailSummary): LinkDraft {
  return {
    student: email.student ? { id: email.student.id, name: email.student.name } : null,
    school: email.school,
    applicationId: email.application?.id ?? null,
  }
}

export function linksInput(links: LinkDraft) {
  return {
    studentId: links.student?.id ?? null,
    schoolId: links.school?.id ?? null,
    applicationId: links.student ? links.applicationId : null,
  }
}

export type DraftCheck =
  | { ok: true }
  | { ok: false; error: string; invalid: Partial<Record<keyof EmailDraft, boolean>> }

/**
 * Runs the same rules as the server before anything is sent, so missing
 * fields are outlined in the form (WEB-05) instead of failing after an upload.
 */
export function checkDraft(draft: EmailDraft, links: LinkDraft): DraftCheck {
  const details = emailDetailsSchema.safeParse(detailsInput(draft))
  if (!details.success) {
    const invalid: Partial<Record<keyof EmailDraft, boolean>> = {}
    for (const issue of details.error.issues) {
      const field = issue.path[0] === 'sentAt' ? 'sentAtLocal' : issue.path[0]
      if (typeof field === 'string' && field in draft) invalid[field as keyof EmailDraft] = true
    }
    return { ok: false, error: details.error.issues[0]?.message ?? 'Check the details', invalid }
  }
  const linked = emailLinksSchema.safeParse(linksInput(links))
  if (!linked.success) return { ok: false, error: linked.error.issues[0]?.message ?? 'Check the links', invalid: {} }
  return { ok: true }
}

/** Which link the dialog shows as fixed: the record whose page the email is filed from. */
export function lockedLink(context: EmailContext): 'student' | 'school' {
  return context.kind === 'school' ? 'school' : 'student'
}
