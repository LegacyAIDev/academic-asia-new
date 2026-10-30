import { describe, it, expect } from 'vitest'
import { EMPTY_FILTERS, filterEmails, hasActiveFilters, hkDay, nextEmailSort, sortEmails } from '../email-list'
import { applicationLabel, storedAttachments, toFiledEmailSummary, type FiledEmailRow, type FiledEmailSummary } from '../filed-email'
import { anyAllowed, emailModules, firstDenied, writeChecks, writeChecksForChange } from '../email-access'

const email = (over: Partial<FiledEmailSummary>): FiledEmailSummary => ({
  id: 'e', direction: 'received', source: 'eml', subject: 'Subject', from: 'Mrs Chan <c@x.com>', to: [], cc: [],
  sentAt: '2026-10-27T01:00:00Z', preview: '', staffNote: null, attachments: [], fileName: 'a.eml', archivedAt: null,
  createdAt: '2026-10-27T02:00:00Z', updatedAt: '2026-10-27T02:00:00Z', createdByName: 'Olivia', updatedByName: null,
  student: null, school: null, application: null, ...over,
})

const list = [
  email({ id: '1', subject: 'Year 9 offer', preview: 'conditional offer for 2027', sentAt: '2026-10-20T16:30:00Z' }),
  email({ id: '2', subject: 'Fees invoice', direction: 'sent', attachments: [{ name: 'invoice.pdf', size: 1, mime: 'application/pdf' }] }),
  email({ id: '3', subject: 'Old thread', archivedAt: '2026-10-27T03:00:00Z', application: { id: 'app', label: 'Headington' } }),
]

describe('filterEmails', () => {
  it('hides archived emails until asked', () => {
    expect(filterEmails(list, EMPTY_FILTERS).map(e => e.id)).toEqual(['1', '2'])
    expect(filterEmails(list, { ...EMPTY_FILTERS, showArchived: true }).map(e => e.id)).toEqual(['1', '2', '3'])
  })

  it('matches every typed word across subject, text preview and attachment names', () => {
    expect(filterEmails(list, { ...EMPTY_FILTERS, query: 'OFFER 2027' }).map(e => e.id)).toEqual(['1'])
    expect(filterEmails(list, { ...EMPTY_FILTERS, query: 'invoice.pdf' }).map(e => e.id)).toEqual(['2'])
    expect(filterEmails(list, { ...EMPTY_FILTERS, query: 'offer fees' })).toEqual([])
  })

  it('also matches emails the server found in their full text, still within the other filters', () => {
    const found = new Set(['2', '3'])
    expect(filterEmails(list, { ...EMPTY_FILTERS, query: 'boarding house' }, found).map(e => e.id)).toEqual(['2'])
    expect(filterEmails(list, { ...EMPTY_FILTERS, query: 'boarding house', direction: 'received' }, found)).toEqual([])
  })

  it('filters by direction, application and Hong Kong calendar day', () => {
    expect(filterEmails(list, { ...EMPTY_FILTERS, direction: 'sent' }).map(e => e.id)).toEqual(['2'])
    expect(filterEmails(list, { ...EMPTY_FILTERS, applicationId: 'app', showArchived: true }).map(e => e.id)).toEqual(['3'])
    // 16:30 UTC on the 20th is already 00:30 on the 21st in Hong Kong.
    expect(hkDay('2026-10-20T16:30:00Z')).toBe('2026-10-21')
    expect(hkDay('2026-10-20T15:30:00Z')).toBe('2026-10-20')
    expect(filterEmails(list, { ...EMPTY_FILTERS, fromDay: '2026-10-21', toDay: '2026-10-21' }).map(e => e.id)).toEqual(['1'])
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false)
    expect(hasActiveFilters({ ...EMPTY_FILTERS, toDay: '2026-10-21' })).toBe(true)
  })
})

describe('sorting', () => {
  it('sorts by column with a stable newest-first tie-break, and flips on a second click', () => {
    expect(sortEmails(list, 'subject', 'asc').map(e => e.id)).toEqual(['2', '3', '1'])
    expect(sortEmails(list, 'sentAt', 'desc').map(e => e.id)).toEqual(['3', '2', '1'])
    expect(nextEmailSort({ key: 'sentAt', dir: 'desc' }, 'subject')).toEqual({ key: 'subject', dir: 'asc' })
    expect(nextEmailSort({ key: 'subject', dir: 'asc' }, 'subject')).toEqual({ key: 'subject', dir: 'desc' })
    expect(nextEmailSort({ key: 'subject', dir: 'asc' }, 'createdAt')).toEqual({ key: 'createdAt', dir: 'desc' })
  })
})

describe('filed email records', () => {
  it('reads the stored attachment list defensively', () => {
    expect(storedAttachments([{ name: 'a.pdf', path: 'p', size: 5, mime: 'application/pdf' }, { name: 1 }, null, 'x', { path: 'only' }]))
      .toEqual([{ name: 'a.pdf', path: 'p', size: 5, mime: 'application/pdf' }])
    expect(storedAttachments({ not: 'a list' })).toEqual([])
  })

  it('never sends storage paths to the browser and names unknown people plainly', () => {
    const row = {
      id: 'e1', direction: 'sent', source: 'msg', subject: 'S', from_name: null, from_address: 'o@academic-asia.com',
      to_addresses: null, cc_addresses: ['c@x.com'], sent_at: 's', body_preview: null, staff_note: null,
      attachments: [{ name: 'a.pdf', path: 'emails/e1/attachments/0_a.pdf', size: 2, mime: 'application/pdf' }],
      file_name: 'm.msg', archived_at: null, created_at: 'c', updated_at: 'u', updated_by: 'gone',
      creator: null, editor: null, student: { id: 's1', first_name: 'Lucas', surname: 'Ng', student_code: 'S000123' },
      school: null, application: { id: 'a1', entry_year: 2027, school: { name: 'Headington School' } },
    } as FiledEmailRow
    const summary = toFiledEmailSummary(row)
    expect(JSON.stringify(summary)).not.toContain('emails/e1')
    expect(summary).toMatchObject({
      from: 'o@academic-asia.com', to: [], cc: ['c@x.com'], createdByName: 'Former staff', updatedByName: 'Former staff',
      student: { id: 's1', name: 'Lucas Ng', code: 'S000123' }, application: { id: 'a1', label: 'Headington School · 2027 entry' },
      attachments: [{ name: 'a.pdf', size: 2, mime: 'application/pdf' }],
    })
    expect(applicationLabel({ entry_year: null, school: null })).toBe('Application')
  })
})

describe('email access', () => {
  const allow = async () => null
  const deny = async () => ({ success: false as const, error: 'no' })

  it('lets the owning record decide writing: the student when linked, else the school', () => {
    expect(emailModules({ studentId: 's', schoolId: 'c' })).toEqual(['students', 'schools'])
    expect(writeChecks({ studentId: 's' })).toEqual([{ module: 'students', level: 2 }])
    expect(writeChecks({ studentId: 's', schoolId: 'c' })).toEqual([{ module: 'students', level: 2 }, { module: 'schools', level: 1 }])
    expect(writeChecks({ schoolId: 'c' })).toEqual([{ module: 'schools', level: 2 }])
    expect(writeChecks({})).toEqual([])
    // Moving a school-only email onto a student needs Schools write (before) and Students write (after).
    expect(writeChecksForChange({ schoolId: 'c' }, { studentId: 's', schoolId: 'c' }))
      .toEqual([{ module: 'schools', level: 2 }, { module: 'students', level: 2 }])
  })

  it('needs every check to pass to write, any one module to read, and refuses when there is nothing to check', async () => {
    const both = writeChecks({ studentId: 's', schoolId: 'c' })
    expect(await firstDenied(both, async m => (m === 'schools' ? deny() : allow()))).toEqual({ success: false, error: 'no' })
    expect(await firstDenied(both, allow)).toBeNull()
    expect((await firstDenied([], allow))?.success).toBe(false)
    expect(await anyAllowed(['students', 'schools'], async m => (m === 'students' ? deny() : allow()))).toBeNull()
    expect((await anyAllowed([], allow))?.success).toBe(false)
  })
})
