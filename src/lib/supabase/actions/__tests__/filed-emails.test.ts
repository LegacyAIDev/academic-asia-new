import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callsOf, makeSupabaseStub, used, type Recorded } from '../../queries/__tests__/supabase-stub'
import { OLE_HEADER, sampleBytes } from '@/lib/emails/__tests__/fixtures'

const state = vi.hoisted(() => ({ client: null as unknown, rights: new Set<string>() }))
const DENIED = { success: false, error: 'You do not have permission to perform this action.' }

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({})) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => state.client) }))
vi.mock('@/lib/permissions/guard', () => ({
  assertAccess: vi.fn(async (module: string, level = 1) => (state.rights.has(`${module}:${level}`) ? null : DENIED)),
}))

import { revalidatePath } from 'next/cache'
import { createManualEmail, fileEmail, prepareEmailUpload } from '../filed-emails'

const ME = '11111111-1111-4111-8111-111111111111'
const OTHER = '99999999-9999-4999-8999-999999999999'
const STUDENT = '22222222-2222-4222-8222-222222222222'
const SCHOOL = '33333333-3333-4333-8333-333333333333'
const APP = '44444444-4444-4444-8444-444444444444'
const UPLOAD = '55555555-5555-4555-8555-555555555555'
const STAGED = `incoming/${ME}/${UPLOAD}/offer.eml`

const details = {
  direction: 'received', subject: 'Offer (edited by staff)', sentAt: '2026-10-27T01:15:00.000Z',
  from: 'Mrs Chan <c@x.com>', to: 'o@academic-asia.com', cc: '', staffNote: 'Mother confirms',
}

type Respond = (rec: Recorded) => { data: unknown; error: unknown }
const defaultRespond: Respond = rec => {
  if (rec.table === 'student_applications') return { data: { id: APP }, error: null }
  if (rec.table === 'filed_emails' && used(rec, 'insert')) return { data: { id: 'new-id' }, error: null }
  return { data: [], error: null }
}

function setup(opts: { rights?: string[]; respond?: Respond; files?: Record<string, Uint8Array>; user?: string | null } = {}) {
  state.rights = new Set(opts.rights ?? ['students:1', 'students:2', 'schools:1', 'schools:2'])
  const stub = makeSupabaseStub(opts.respond ?? defaultRespond, opts.files ?? {})
  state.client = Object.assign(stub.supabase, {
    auth: { getUser: async () => ({ data: { user: opts.user === null ? null : { id: opts.user ?? ME } }, error: null }) },
  })
  return stub
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.mocked(revalidatePath).mockClear()
})
afterEach(() => vi.restoreAllMocks())

describe('prepareEmailUpload', () => {
  it('gives a one-time upload link inside the uploader\'s own staging folder', async () => {
    const stub = setup()
    const result = await prepareEmailUpload({ links: { studentId: STUDENT }, fileName: 'Re: offer.eml', size: 2048 })
    expect(result.success).toBe(true)
    expect(result.data?.path).toMatch(new RegExp(`^incoming/${ME}/[0-9a-f-]{36}/Re__offer\\.eml$`))
    expect(stub.storageCalls.map(c => c.method)).toEqual(['createSignedUploadUrl'])
  })

  it('needs write on the owning student and sight of the school, before touching anything', async () => {
    let stub = setup({ rights: ['students:1', 'schools:2'] })
    expect(await prepareEmailUpload({ links: { studentId: STUDENT }, fileName: 'a.eml', size: 1 })).toEqual(DENIED)
    stub = setup({ rights: ['students:2'] })
    expect(await prepareEmailUpload({ links: { studentId: STUDENT, schoolId: SCHOOL }, fileName: 'a.eml', size: 1 })).toEqual(DENIED)
    expect(stub.queries).toHaveLength(0)
    expect(stub.storageCalls).toHaveLength(0)
    // A consultant with Students write and Schools read may file an application email that also shows on the school (D4).
    setup({ rights: ['students:2', 'schools:1'] })
    expect((await prepareEmailUpload({ links: { studentId: STUDENT, schoolId: SCHOOL }, fileName: 'a.eml', size: 1 })).success).toBe(true)
    // A school-only email needs Schools write.
    setup({ rights: ['students:2', 'schools:1'] })
    expect(await prepareEmailUpload({ links: { schoolId: SCHOOL }, fileName: 'a.eml', size: 1 })).toEqual(DENIED)
  })

  it('refuses the wrong file type, an oversized file, missing links and a signed-out user', async () => {
    setup()
    expect((await prepareEmailUpload({ links: { studentId: STUDENT }, fileName: 'a.docx', size: 1 })).error).toMatch(/Only .eml/)
    expect((await prepareEmailUpload({ links: { studentId: STUDENT }, fileName: 'a.msg', size: 26 * 1024 * 1024 })).error).toMatch(/25 MB/)
    expect((await prepareEmailUpload({ links: {}, fileName: 'a.msg', size: 1 })).error).toMatch(/student or a school/)
    setup({ user: null })
    expect((await prepareEmailUpload({ links: { studentId: STUDENT }, fileName: 'a.msg', size: 1 })).error).toMatch(/sign in/)
  })

  it('warns instead of uploading when the same email is already filed here (EF-09)', async () => {
    const stub = setup({
      respond: rec => (rec.table === 'filed_emails' ? { data: [{ subject: 'Offer', sent_at: '2026-10-27T01:15:00Z' }], error: null } : defaultRespond(rec)),
    })
    const result = await prepareEmailUpload({ links: { studentId: STUDENT }, fileName: 'a.eml', size: 1, messageId: '<m@x>' })
    expect(result).toEqual({ success: false, error: 'Already filed here: "Offer" (27/10/2026 09:15)' })
    expect(stub.storageCalls).toHaveLength(0)
  })

  it('refuses an application that belongs to another student', async () => {
    setup({ respond: rec => (rec.table === 'student_applications' ? { data: null, error: null } : defaultRespond(rec)) })
    const result = await prepareEmailUpload({ links: { studentId: STUDENT, applicationId: APP }, fileName: 'a.eml', size: 1 })
    expect(result.error).toBe('That application belongs to another student')
  })
})

describe('fileEmail', () => {
  it('reads the stored file itself, cleans the body and saves staff-edited details', async () => {
    const stub = setup({ files: { [STAGED]: sampleBytes() } })
    const result = await fileEmail({ links: { studentId: STUDENT, schoolId: SCHOOL }, details: { ...details, stagedPath: STAGED, fileName: 'offer.eml' } })
    expect(result.success).toBe(true)

    const insert = stub.queries.find(q => used(q, 'insert'))!
    const row = callsOf(insert, 'insert')[0][0] as Record<string, unknown>
    expect(row).toMatchObject({
      subject: 'Offer (edited by staff)', direction: 'received', staff_note: 'Mother confirms', created_by: ME,
      student_id: STUDENT, school_id: SCHOOL, application_id: null, source: 'eml',
      body_text: 'Hello Olivia, we confirm Year 9 entry.', message_id: '<abc123@mail.example.com>', file_name: 'offer.eml',
    })
    expect(row.body_html).toBe('<p>Hello Olivia,<br />we <b>confirm</b> Year 9 entry.</p>')
    expect(row.file_path).toBe(`emails/${row.id}/original_offer.eml`)
    expect(row.attachments).toEqual([{ name: 'report.pdf', size: 54, mime: 'application/pdf', path: `emails/${row.id}/attachments/0_report.pdf` }])
    expect(stub.storageCalls.map(c => c.method)).toEqual(['download', 'upload', 'move'])
    expect(stub.storageCalls[2].args).toEqual([STAGED, `emails/${row.id}/original_offer.eml`])
    expect(vi.mocked(revalidatePath).mock.calls.map(c => c[0]).sort()).toEqual([`/schools/${SCHOOL}`, `/students/${STUDENT}`])
  })

  it('refuses a staged path that is not the user\'s own, without reading storage', async () => {
    const stub = setup({ files: { [STAGED]: sampleBytes() }, user: OTHER })
    const result = await fileEmail({ links: { studentId: STUDENT }, details: { ...details, stagedPath: STAGED, fileName: 'offer.eml' } })
    expect(result).toEqual({ success: false, error: 'Upload not found' })
    expect(stub.storageCalls).toHaveLength(0)
  })

  it('refuses a display name that claims a different type from the staged file', async () => {
    const stub = setup({ files: { [STAGED]: sampleBytes() } })
    const result = await fileEmail({ links: { studentId: STUDENT }, details: { ...details, stagedPath: STAGED, fileName: 'offer.pdf' } })
    expect(result).toEqual({ success: false, error: 'Upload not found' })
    expect(stub.storageCalls).toHaveLength(0)
  })

  it('refuses a renamed file and removes the staged upload', async () => {
    const path = `incoming/${ME}/${UPLOAD}/fake.msg`
    const stub = setup({ files: { [path]: sampleBytes() } })
    const result = await fileEmail({ links: { studentId: STUDENT }, details: { ...details, stagedPath: path, fileName: 'fake.msg' } })
    expect(result.error).toMatch(/not a real .msg email/)
    expect(stub.storageCalls.map(c => c.method)).toEqual(['download', 'remove'])
    expect(stub.queries.some(q => used(q, 'insert'))).toBe(false)
  })

  it('cleans up everything it stored when the email turns out to be a duplicate or the insert fails', async () => {
    let stub = setup({
      files: { [STAGED]: sampleBytes() },
      respond: rec => (rec.table === 'filed_emails' && !used(rec, 'insert') ? { data: [{ subject: 'Offer', sent_at: '2026-10-27T01:15:00Z' }], error: null } : defaultRespond(rec)),
    })
    expect((await fileEmail({ links: { studentId: STUDENT }, details: { ...details, stagedPath: STAGED, fileName: 'offer.eml' } })).error).toMatch(/Already filed here/)
    expect(stub.storageCalls.at(-1)?.method).toBe('remove')
    expect((stub.storageCalls.at(-1)?.args[0] as string[]).length).toBe(2)

    stub = setup({
      files: { [STAGED]: sampleBytes() },
      respond: rec => (used(rec, 'insert') ? { data: null, error: { code: '23505', message: 'dup' } } : defaultRespond(rec)),
    })
    expect((await fileEmail({ links: { studentId: STUDENT }, details: { ...details, stagedPath: STAGED, fileName: 'offer.eml' } })).error).toBe('This email is already filed here.')
    expect(stub.storageCalls.at(-1)?.method).toBe('remove')
  })

  it('stores a PDF as it is, with the details staff typed', async () => {
    const path = `incoming/${ME}/${UPLOAD}/printed.pdf`
    const stub = setup({ files: { [path]: new TextEncoder().encode('%PDF-1.4\n%%EOF') } })
    expect((await fileEmail({ links: { schoolId: SCHOOL }, details: { ...details, stagedPath: path, fileName: 'printed.pdf' } })).success).toBe(true)
    const row = callsOf(stub.queries.find(q => used(q, 'insert'))!, 'insert')[0][0] as Record<string, unknown>
    expect(row).toMatchObject({ source: 'pdf', body_text: null, body_html: null, message_id: null, attachments: [] })
  })

  it('reports an unreadable Outlook file in words', async () => {
    const path = `incoming/${ME}/${UPLOAD}/broken.msg`
    setup({ files: { [path]: OLE_HEADER } })
    const result = await fileEmail({ links: { studentId: STUDENT }, details: { ...details, stagedPath: path, fileName: 'broken.msg' } })
    expect(result.error).toMatch(/could not be read/)
  })
})

describe('createManualEmail', () => {
  it('saves a typed record with its text and no file (EF-08)', async () => {
    const stub = setup()
    const result = await createManualEmail({ links: { studentId: STUDENT }, details: { ...details, body: 'Phoned to confirm by email' } })
    expect(result).toEqual({ success: true, data: { id: 'new-id' } })
    const row = callsOf(stub.queries.find(q => used(q, 'insert'))!, 'insert')[0][0] as Record<string, unknown>
    expect(row).toMatchObject({ source: 'manual', body_text: 'Phoned to confirm by email', created_by: ME })
    expect(row).not.toHaveProperty('file_path')
  })

  it('validates before saving and needs write access', async () => {
    let stub = setup()
    expect((await createManualEmail({ links: { studentId: STUDENT }, details: { ...details, body: '' } })).error).toMatch(/text or a summary/)
    expect((await createManualEmail({ links: { studentId: STUDENT }, details: { ...details, subject: '' } })).error).toBe('Add a subject')
    expect(stub.queries).toHaveLength(0)
    stub = setup({ rights: ['schools:2'] })
    expect(await createManualEmail({ links: { studentId: STUDENT }, details: { ...details, body: 'x' } })).toEqual(DENIED)
    expect(stub.queries).toHaveLength(0)
  })
})
