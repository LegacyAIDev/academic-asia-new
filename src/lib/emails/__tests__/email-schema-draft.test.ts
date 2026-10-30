import { describe, it, expect } from 'vitest'
import { detailColumns, emailDetailsSchema, emailLinksSchema, linkColumns, manualEmailSchema } from '../email-schema'
import {
  checkDraft, detailsInput, draftFromEmail, draftFromParsed, linksFromContext, linksInput, lockedLink, type EmailDraft,
} from '../email-draft'
import type { FiledEmailSummary } from '../filed-email'

const STUDENT = '11111111-1111-4111-8111-111111111111'
const SCHOOL = '22222222-2222-4222-8222-222222222222'
const APP = '33333333-3333-4333-8333-333333333333'

const draft: EmailDraft = {
  direction: 'received', subject: ' Offer ', sentAtLocal: '2026-10-27T09:15',
  from: 'Mrs Chan <c@x.com>', to: 'Olivia <o@academic-asia.com>; b@y.com', cc: '', staffNote: ' ',
}

describe('emailLinksSchema', () => {
  it('needs a student or a school, and an application only with its student', () => {
    expect(emailLinksSchema.safeParse({ studentId: STUDENT }).success).toBe(true)
    expect(emailLinksSchema.safeParse({ schoolId: SCHOOL, studentId: '' }).success).toBe(true)
    expect(emailLinksSchema.safeParse({}).error?.issues[0].message).toBe('Link the email to a student or a school')
    expect(emailLinksSchema.safeParse({ schoolId: SCHOOL, applicationId: APP }).error?.issues[0].message)
      .toMatch(/only be linked with its student/)
    expect(emailLinksSchema.safeParse({ studentId: 'student-1' }).success).toBe(false)
  })
})

describe('emailDetailsSchema', () => {
  it('requires a subject and a real date that is not in the future', () => {
    const base = detailsInput(draft)
    expect(emailDetailsSchema.safeParse(base).success).toBe(true)
    expect(emailDetailsSchema.safeParse({ ...base, subject: '  ' }).error?.issues[0].message).toBe('Add a subject')
    expect(emailDetailsSchema.safeParse({ ...base, sentAt: '' }).success).toBe(false)
    expect(emailDetailsSchema.safeParse({ ...base, sentAt: '2999-01-01T00:00:00Z' }).error?.issues[0].message).toMatch(/future/)
    expect(emailDetailsSchema.safeParse({ ...base, direction: 'sideways' }).success).toBe(false)
    expect(manualEmailSchema.safeParse({ ...base, body: ' ' }).error?.issues[0].message).toMatch(/text or a summary/)
  })

  it('maps to database columns, splitting addresses and dropping an empty note', () => {
    const cols = detailColumns(emailDetailsSchema.parse(detailsInput(draft)))
    expect(cols).toEqual({
      direction: 'received', subject: 'Offer', sent_at: '2026-10-27T01:15:00.000Z',
      from_name: 'Mrs Chan', from_address: 'c@x.com',
      to_addresses: ['Olivia <o@academic-asia.com>', 'b@y.com'], cc_addresses: [], staff_note: null,
    })
    expect(linkColumns({ studentId: STUDENT, schoolId: null, applicationId: APP }))
      .toEqual({ student_id: STUDENT, school_id: null, application_id: APP })
  })
})

describe('email drafts', () => {
  it('pre-fills from a parsed file, guessing direction and keeping Hong Kong time', () => {
    const filled = draftFromParsed({
      subject: '', from: { name: 'Olivia', address: 'o@academic-asia.com' }, to: [{ name: '', address: 'c@x.com' }], cc: [],
      sentAt: '2026-10-27T01:15:00.000Z', text: null, html: null, messageId: null, attachments: [],
    })
    expect(filled).toMatchObject({ direction: 'sent', subject: '(no subject)', sentAtLocal: '2026-10-27T09:15', to: 'c@x.com' })
  })

  it('turns a saved email back into the form, leaving out the placeholder sender', () => {
    const email = { direction: 'sent', subject: 'S', sentAt: '2026-10-27T01:15:00Z', from: 'Unknown sender', to: ['a@x.com', 'b@y.com'], cc: [], staffNote: null } as unknown as FiledEmailSummary
    expect(draftFromEmail(email)).toEqual({ direction: 'sent', subject: 'S', sentAtLocal: '2026-10-27T09:15', from: '', to: 'a@x.com; b@y.com', cc: '', staffNote: '' })
  })

  it('links by where the email is filed from; an application page also links its school (D4)', () => {
    const student = { id: STUDENT, name: 'Lucas' }
    const school = { id: SCHOOL, name: 'Headington' }
    expect(linksFromContext({ kind: 'student', student })).toEqual({ student, school: null, applicationId: null })
    expect(linksFromContext({ kind: 'school', school })).toEqual({ student: null, school, applicationId: null })
    expect(linksFromContext({ kind: 'application', student, school, applicationId: APP })).toEqual({ student, school, applicationId: APP })
    expect(lockedLink({ kind: 'school', school })).toBe('school')
    expect(linksInput({ student: null, school, applicationId: APP })).toEqual({ studentId: null, schoolId: SCHOOL, applicationId: null })
  })

  it('outlines the fields that block saving before anything is sent', () => {
    const links = { student: { id: STUDENT, name: 'L' }, school: null, applicationId: null }
    expect(checkDraft(draft, links)).toEqual({ ok: true })
    const bad = checkDraft({ ...draft, subject: '', sentAtLocal: '2026-02-30T10:00' }, links)
    expect(bad).toMatchObject({ ok: false, error: 'Add a subject', invalid: { subject: true, sentAtLocal: true } })
    expect(checkDraft(draft, { student: null, school: null, applicationId: null }))
      .toMatchObject({ ok: false, error: 'Link the email to a student or a school' })
  })
})
