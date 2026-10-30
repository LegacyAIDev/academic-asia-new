import { z } from 'zod'
import { isUuid } from '@/lib/scheduler/uuid'
import { formatAddress, parseAddress, parseAddressList } from './email-form'

/**
 * What staff send when they file, type or edit an email. The same schemas run
 * in the form and in every server action, so a request that skips the form
 * still gets the same limits as the database.
 */

const optionalId = z
  .string()
  .nullable()
  .optional()
  .transform(v => (v ? v : null))
  .refine(v => v === null || isUuid(v), 'Unknown record')

export const emailLinksSchema = z
  .object({ studentId: optionalId, schoolId: optionalId, applicationId: optionalId })
  .refine(l => l.studentId !== null || l.schoolId !== null, 'Link the email to a student or a school')
  .refine(l => l.applicationId === null || l.studentId !== null, 'An application can only be linked with its student')

export type EmailLinks = z.infer<typeof emailLinksSchema>

const MAX_LIST = 100

export const emailDetailsSchema = z.object({
  direction: z.enum(['received', 'sent'], { errorMap: () => ({ message: 'Choose received or sent' }) }),
  subject: z.string().trim().min(1, 'Add a subject').max(998, 'The subject is too long'),
  sentAt: z
    .string()
    .refine(v => !Number.isNaN(Date.parse(v)), 'Add the date and time of the email')
    .refine(v => Date.parse(v) <= Date.now() + 24 * 60 * 60 * 1000, 'The date is in the future'),
  from: z.string().max(400, 'The sender is too long').default(''),
  to: z.string().max(20000).default(''),
  cc: z.string().max(20000).default(''),
  staffNote: z.string().trim().max(2000, 'Notes can be up to 2,000 characters').default(''),
})

export type EmailDetailsInput = z.input<typeof emailDetailsSchema>

export const manualEmailSchema = emailDetailsSchema.extend({
  body: z.string().trim().min(1, 'Add the email text or a summary').max(20000, 'Up to 20,000 characters'),
})

export const fileEmailSchema = emailDetailsSchema.extend({
  stagedPath: z.string().min(1).max(600),
  fileName: z.string().trim().min(1).max(255),
})

/** The first problem in words, for a toast or a field message. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Check the details and try again'
}

/** Database columns for the header fields staff can edit. */
export function detailColumns(details: z.output<typeof emailDetailsSchema>) {
  const from = parseAddress(details.from)
  const list = (raw: string) => parseAddressList(raw).map(formatAddress).filter(Boolean).slice(0, MAX_LIST)
  return {
    direction: details.direction,
    subject: details.subject,
    sent_at: new Date(details.sentAt).toISOString(),
    from_name: from?.name.slice(0, 320) || null,
    from_address: from?.address.slice(0, 320) || null,
    to_addresses: list(details.to),
    cc_addresses: list(details.cc),
    staff_note: details.staffNote || null,
  }
}

export function linkColumns(links: EmailLinks) {
  return { student_id: links.studentId, school_id: links.schoolId, application_id: links.applicationId }
}
