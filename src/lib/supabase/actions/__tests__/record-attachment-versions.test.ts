import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callsOf, makeSupabaseStub, used, type Recorded } from '../../queries/__tests__/supabase-stub'

const state = vi.hoisted(() => ({ client: null as unknown, rights: new Set<string>() }))
const DENIED = { success: false, error: 'You do not have permission to perform this action.' }

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({})) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => state.client) }))
vi.mock('@/lib/supabase/document-categories', () => ({ getCategoryId: vi.fn(async () => 9) }))
vi.mock('@/lib/permissions/guard', () => ({
  assertAccess: vi.fn(async (module: string, level = 1) => (state.rights.has(`${module}:${level}`) ? null : DENIED)),
}))

import { listAttachmentVersions, replaceAttachmentFile } from '../record-attachment-versions'

const SCHOOL = '11111111-1111-4111-8111-111111111111'
const PAPER = '22222222-2222-4222-8222-222222222222'
const EXAM = '33333333-3333-4333-8333-333333333333'
const current = { id: PAPER, attachable_id: EXAM, category_id: 9, title: 'English', file_path: 'old.pdf', superseded_by: null }

function form(type = 'application/pdf') {
  const fd = new FormData()
  fd.append('file', new File(['%PDF-1.4'], 'english-2027.pdf', { type }))
  return fd
}

function setup(respond: (rec: Recorded) => { data: unknown; error: unknown }, rights = ['exams:1', 'exams:2']) {
  state.rights = new Set(rights)
  const stub = makeSupabaseStub(respond)
  state.client = Object.assign(stub.supabase, { auth: { getUser: async () => ({ data: { user: { id: 'me' } }, error: null }) } })
  return stub
}

const happy = (rec: Recorded) => {
  if (used(rec, 'insert')) return { data: { id: 'new-version' }, error: null }
  if (used(rec, 'update')) return { data: [{ id: PAPER }], error: null }
  return { data: current, error: null }
}

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
afterEach(() => vi.restoreAllMocks())

describe('replaceAttachmentFile', () => {
  it('stores the new file as a new row and marks the old one as replaced by it', async () => {
    const stub = setup(happy)
    expect(await replaceAttachmentFile('school_entrance_exam_paper', PAPER, SCHOOL, form())).toEqual({ success: true, data: { id: 'new-version' } })
    const insert = callsOf(stub.queries.find(q => used(q, 'insert'))!, 'insert')[0][0]
    expect(insert).toMatchObject({ school_id: SCHOOL, attachable_id: EXAM, attachable_type: 'school_entrance_exams', title: 'English', uploaded_by: 'me', file_name: 'english-2027.pdf' })
    const mark = stub.queries.find(q => used(q, 'update'))!
    expect(callsOf(mark, 'update')[0][0]).toMatchObject({ superseded_by: 'new-version' })
    expect(callsOf(mark, 'is')).toEqual([['superseded_by', null]])
    expect(stub.storageCalls.map(c => c.method)).toEqual(['upload'])
  })

  it('is for the exam team on exam papers only, and only for PDFs and images', async () => {
    let stub = setup(happy, ['schools:2'])
    expect(await replaceAttachmentFile('school_entrance_exam_paper', PAPER, SCHOOL, form())).toEqual(DENIED)
    stub = setup(happy, ['schools:2'])
    expect((await replaceAttachmentFile('school_fee', PAPER, SCHOOL, form())).error).toBe('These files cannot be replaced')
    expect(stub.queries).toHaveLength(0)
    setup(happy)
    expect((await replaceAttachmentFile('school_entrance_exam_paper', PAPER, SCHOOL, form('text/html'))).error).toMatch(/Only PDF/)
  })

  it('refuses a file that was already replaced', async () => {
    const stub = setup(() => ({ data: { ...current, superseded_by: "x" }, error: null }))
    expect((await replaceAttachmentFile('school_entrance_exam_paper', PAPER, SCHOOL, form())).error).toMatch(/already replaced/)
    expect(stub.storageCalls).toHaveLength(0)
  })

  it('undoes the new version when someone else replaced the file at the same moment', async () => {
    const stub = setup(rec => (used(rec, 'update') ? { data: [], error: null } : happy(rec)))
    expect((await replaceAttachmentFile('school_entrance_exam_paper', PAPER, SCHOOL, form())).error).toMatch(/same time/)
    expect(stub.queries.some(q => used(q, 'delete'))).toBe(true)
    expect(stub.storageCalls.map(c => c.method)).toEqual(['upload', 'remove'])
  })
})

describe('listAttachmentVersions', () => {
  it('refuses anyone outside the exam team, who may not see papers at all', async () => {
    setup(happy, ['exams:1', 'schools:2'])
    expect(await listAttachmentVersions('school_entrance_exam_paper', PAPER)).toEqual(DENIED)
  })

  it('lists the earlier files of this paper only, newest first, with who uploaded them', async () => {
    setup(rec => (used(rec, 'not')
      ? { data: [
        { id: 'v1', file_name: 'english-2025.pdf', title: 'English', file_size: 10, file_path: 'v1.pdf', created_at: '2025-01-01T00:00:00Z', superseded_by: 'v2', superseded_at: '2026-01-01T00:00:00Z', uploader: null },
        { id: 'v2', file_name: 'english-2026.pdf', title: 'English', file_size: 20, file_path: 'v2.pdf', created_at: '2026-01-01T00:00:00Z', superseded_by: PAPER, superseded_at: '2026-10-30T00:00:00Z', uploader: { first_name: 'Maggie', surname: 'Manager' } },
        { id: 'maths-old', file_name: 'maths.pdf', title: 'Maths', file_size: 5, file_path: 'm.pdf', created_at: '2025-01-01T00:00:00Z', superseded_by: 'maths-new', superseded_at: 'x', uploader: null },
      ], error: null }
      : { data: { attachable_id: EXAM }, error: null }), ['exams:2'])
    const result = await listAttachmentVersions('school_entrance_exam_paper', PAPER)
    expect(result.data?.map(v => [v.id, v.name, v.uploadedBy])).toEqual([['v2', 'english-2026.pdf', 'Maggie Manager'], ['v1', 'english-2025.pdf', null]])
  })
})
