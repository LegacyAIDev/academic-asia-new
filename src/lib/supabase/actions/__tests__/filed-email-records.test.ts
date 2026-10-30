import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callsOf, makeSupabaseStub, used, type Recorded } from '../../queries/__tests__/supabase-stub'

const state = vi.hoisted(() => ({ client: null as unknown, rights: new Set<string>(), level: 6 as number | null }))
const DENIED = { success: false, error: 'You do not have permission to perform this action.' }

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({})) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => state.client) }))
vi.mock('@/lib/supabase/auth', () => ({ getCurrentUser: vi.fn(async () => ({ id: 'me', admin_level: state.level })) }))
vi.mock('@/lib/permissions/guard', () => ({
  assertAccess: vi.fn(async (module: string, level = 1) => (state.rights.has(`${module}:${level}`) ? null : DENIED)),
}))

import { deleteFiledEmail, getFiledEmailDetail, getFiledEmailFileUrl, setFiledEmailArchived, updateFiledEmail } from '../filed-email-records'

const EMAIL = '11111111-1111-4111-8111-111111111111'
const STUDENT = '22222222-2222-4222-8222-222222222222'
const SCHOOL = '33333333-3333-4333-8333-333333333333'

const current = {
  id: EMAIL, student_id: STUDENT, school_id: null, application_id: null, archived_at: null,
  file_path: `emails/${EMAIL}/original_offer.msg`, file_name: 'offer.msg',
  attachments: [
    { name: 'report.pdf', size: 10, mime: 'application/pdf', path: `emails/${EMAIL}/attachments/0_report.pdf` },
    { name: 'form.docx', size: 10, mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', path: `emails/${EMAIL}/attachments/1_form.docx` },
  ],
}
const detailRow = {
  ...current, direction: 'received', source: 'msg', subject: 'Offer', from_name: 'Mrs Chan', from_address: 'c@x.com',
  to_addresses: [], cc_addresses: [], sent_at: '2026-10-27T01:15:00Z', body_preview: 'Hello', staff_note: null,
  created_at: 'c', updated_at: 'u', updated_by: null, creator: { first_name: 'Olivia', surname: 'Wong' }, editor: null,
  student: { id: STUDENT, first_name: 'Lucas', surname: 'Ng', student_code: 'S1' }, school: null, application: null,
  body_html: '<p>Hello</p>', body_text: 'Hello',
}
const details = { direction: 'sent', subject: 'Fixed subject', sentAt: '2026-10-27T01:15:00Z', from: '', to: '', cc: '', staffNote: '' }

function setup(rights: string[], row: Record<string, unknown> | null = current, respond?: (rec: Recorded) => { data: unknown; error: unknown }) {
  state.rights = new Set(rights)
  const stub = makeSupabaseStub(respond ?? (rec => {
    if (rec.table !== 'filed_emails') return { data: { id: 'app' }, error: null }
    if (used(rec, 'update') || used(rec, 'delete')) return { data: null, error: null }
    if (used(rec, 'single')) return { data: detailRow, error: null }
    return { data: row, error: null }
  }))
  state.client = Object.assign(stub.supabase, { auth: { getUser: async () => ({ data: { user: { id: 'me' } }, error: null }) } })
  return stub
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  state.level = 6
})
afterEach(() => vi.restoreAllMocks())

describe('getFiledEmailDetail', () => {
  it('opens for anyone who can read one of the linked records, without storage paths', async () => {
    setup(['students:1'])
    const result = await getFiledEmailDetail(EMAIL)
    expect(result.data).toMatchObject({ subject: 'Offer', bodyHtml: '<p>Hello</p>', createdByName: 'Olivia Wong' })
    expect(JSON.stringify(result.data)).not.toContain('emails/')
  })

  it('refuses without read access, and reports a bad or unknown id as not found', async () => {
    setup(['schools:1'])
    expect(await getFiledEmailDetail(EMAIL)).toEqual(DENIED)
    const stub = setup(['students:1'])
    expect(await getFiledEmailDetail('not-a-uuid')).toEqual({ success: false, error: 'Email not found' })
    expect(stub.queries).toHaveLength(0)
    setup(['students:1'], null)
    expect(await getFiledEmailDetail(EMAIL)).toEqual({ success: false, error: 'Email not found' })
  })
})

describe('getFiledEmailFileUrl', () => {
  it('signs only the stored paths: the original as a download, a PDF to open, other types as downloads', async () => {
    const stub = setup(['students:1'])
    expect((await getFiledEmailFileUrl(EMAIL, 'original')).data?.url).toBe(`signed:${current.file_path}`)
    await getFiledEmailFileUrl(EMAIL, 0)
    await getFiledEmailFileUrl(EMAIL, 1)
    expect(stub.storageCalls.map(c => c.args)).toEqual([
      [current.file_path, 60, { download: 'offer.msg' }],
      [current.attachments[0].path, 60, undefined],
      [current.attachments[1].path, 60, { download: 'form.docx' }],
    ])
  })

  it('refuses an attachment number that does not exist', async () => {
    const stub = setup(['students:1'])
    expect(await getFiledEmailFileUrl(EMAIL, 7)).toEqual({ success: false, error: 'File not found' })
    expect(stub.storageCalls).toHaveLength(0)
  })
})

describe('updateFiledEmail', () => {
  it('needs write on the owning student and sight of any school it is shown on', async () => {
    let stub = setup(['students:2'])
    expect(await updateFiledEmail(EMAIL, { links: { studentId: STUDENT, schoolId: SCHOOL }, details })).toEqual(DENIED)
    expect(stub.queries.some(q => used(q, 'update'))).toBe(false)
    stub = setup(['students:1', 'schools:2'])
    expect(await updateFiledEmail(EMAIL, { links: { studentId: STUDENT, schoolId: SCHOOL }, details })).toEqual(DENIED)

    stub = setup(['students:2', 'schools:1'])
    expect(await updateFiledEmail(EMAIL, { links: { studentId: STUDENT, schoolId: SCHOOL }, details })).toEqual({ success: true })
    const update = callsOf(stub.queries.find(q => used(q, 'update'))!, 'update')[0][0]
    expect(update).toMatchObject({ subject: 'Fixed subject', direction: 'sent', school_id: SCHOOL, updated_by: 'me' })
    expect(update).not.toHaveProperty('body_html')
    expect(update).not.toHaveProperty('file_path')
  })
})

describe('setFiledEmailArchived', () => {
  it('archives and restores with who did it, for staff with write access', async () => {
    const stub = setup(['students:2'])
    expect(await setFiledEmailArchived(EMAIL, true)).toEqual({ success: true })
    expect(callsOf(stub.queries.find(q => used(q, 'update'))!, 'update')[0][0]).toMatchObject({ archived_by: 'me', updated_by: 'me' })
    setup(['students:1'])
    expect(await setFiledEmailArchived(EMAIL, false)).toEqual(DENIED)
  })
})

describe('deleteFiledEmail', () => {
  it('is for managers only (D5)', async () => {
    const stub = setup(['students:2'])
    expect((await deleteFiledEmail(EMAIL)).error).toMatch(/Only managers/)
    expect(stub.queries.some(q => used(q, 'delete'))).toBe(false)
  })

  it('removes the record, then the original and every attachment from storage', async () => {
    state.level = 3
    const stub = setup(['students:2'])
    expect(await deleteFiledEmail(EMAIL)).toEqual({ success: true })
    expect(stub.queries.some(q => used(q, 'delete'))).toBe(true)
    expect(stub.storageCalls).toEqual([{
      bucket: 'filed-emails', method: 'remove',
      args: [[current.file_path, current.attachments[0].path, current.attachments[1].path]],
    }])
  })
})
