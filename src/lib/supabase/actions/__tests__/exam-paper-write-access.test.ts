import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { makeSupabaseStub, used, type Recorded } from '../../queries/__tests__/supabase-stub'
import { clearCategoryCodeCache } from '../../document-categories'

const state = vi.hoisted(() => ({ client: null as unknown, rights: new Set<string>() }))
const DENIED = { success: false, error: 'You do not have permission to perform this action.' }

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({})) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => state.client) }))
vi.mock('@/lib/permissions/guard', () => ({
  assertAccess: vi.fn(async (module: string, level = 1) => (state.rights.has(`${module}:${level}`) ? null : DENIED)),
}))

import { attachFileToRecord, attachLinkToRecord, deleteAttachmentsForRecord } from '../record-attachments'
import { uploadSchoolDocuments } from '../school-documents'

const SCHOOLS_STAFF = ['schools:1', 'schools:2', 'exams:1']
const EXAM_TEAM = [...SCHOOLS_STAFF, 'exams:2']
const CATEGORIES = [
  { id: 7, code: 'school_entrance_exam_paper' },
  { id: 8, code: 'school_brochure' },
  { id: 9, code: 'school_note_attachment' },
  { id: 10, code: 'school_fee_schedule' },
  { id: 11, code: 'school_bank_document' },
]

type Result = { data: unknown; error: unknown; count?: number | null }

/** Categories table answers with the fixture; every other table answers like a successful write. */
function setup(rights: string[], categories: Result = { data: CATEGORIES, error: null }) {
  state.rights = new Set(rights)
  const stub = makeSupabaseStub((rec: Recorded): Result => {
    if (rec.table === 'document_categories') return categories
    if (used(rec, 'select') && !used(rec, 'insert')) return { data: [{ id: 'row-1', file_path: 'x/y.pdf' }], error: null }
    return { data: { id: 'new-1' }, error: null }
  })
  state.client = stub.supabase
  return stub
}

const pdf = () => new File(['%PDF'], 'maths.pdf', { type: 'application/pdf' })
const formWithFile = (key = 'file') => {
  const form = new FormData()
  form.append(key, pdf())
  return form
}
const writes = (queries: Recorded[]) => queries.filter(q => q.table === 'school_documents' && (used(q, 'insert') || used(q, 'delete')))
const uploads = (calls: { method: string }[]) => calls.filter(c => c.method === 'upload')

beforeEach(() => {
  clearCategoryCodeCache()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('uploadSchoolDocuments - the paper category', () => {
  it('refuses a paper for Schools staff without storing a file or a row', async () => {
    const { queries, storageCalls } = setup(SCHOOLS_STAFF)
    const result = await uploadSchoolDocuments('school-1', [{ category_id: 7 }], formWithFile('file_0'))
    expect(result.data).toMatchObject({ uploaded: 0, failed: 1 })
    expect(storageCalls).toHaveLength(0)
    expect(writes(queries)).toHaveLength(0)
  })

  it('stores a paper for the exam team', async () => {
    const { storageCalls } = setup(EXAM_TEAM)
    const result = await uploadSchoolDocuments('school-1', [{ category_id: 7 }], formWithFile('file_0'))
    expect(result.data).toMatchObject({ uploaded: 1, failed: 0 })
    expect(uploads(storageCalls as never)).toHaveLength(1)
  })

  it('still stores an ordinary document for Schools staff', async () => {
    const { storageCalls } = setup(SCHOOLS_STAFF)
    const result = await uploadSchoolDocuments('school-1', [{ category_id: 8 }], formWithFile('file_0'))
    expect(result.data).toMatchObject({ uploaded: 1, failed: 0 })
    expect(uploads(storageCalls as never)).toHaveLength(1)
  })

  it('refuses a paper when the category list could not be loaded', async () => {
    const { storageCalls } = setup(SCHOOLS_STAFF, { data: null, error: { message: 'down' } })
    const result = await uploadSchoolDocuments('school-1', [{ category_id: 7 }], formWithFile('file_0'))
    expect(result.data).toMatchObject({ uploaded: 0 })
    expect(storageCalls).toHaveLength(0)
  })
})

describe('attachFileToRecord / attachLinkToRecord / deleteAttachmentsForRecord - the paper attach point', () => {
  it('refuses to attach a paper file to Schools staff before touching storage or the database', async () => {
    const { queries, storageCalls } = setup(SCHOOLS_STAFF)
    expect(await attachFileToRecord('school_entrance_exam_paper', 'exam-1', 'school-1', formWithFile())).toEqual(DENIED)
    expect(queries).toHaveLength(0)
    expect(storageCalls).toHaveLength(0)
  })

  it('refuses to attach a paper link to Schools staff', async () => {
    const { queries } = setup(SCHOOLS_STAFF)
    expect(await attachLinkToRecord('school_entrance_exam_paper', 'exam-1', 'school-1', 'https://example.com/p.pdf')).toEqual(DENIED)
    expect(queries).toHaveLength(0)
  })

  it('refuses to remove all papers of an exam for Schools staff', async () => {
    const { queries, storageCalls } = setup(SCHOOLS_STAFF)
    expect(await deleteAttachmentsForRecord('school_entrance_exam_paper', 'exam-1', 'school-1')).toEqual(DENIED)
    expect(queries).toHaveLength(0)
    expect(storageCalls).toHaveLength(0)
  })

  it('lets the exam team attach a paper file with the paper category and parent type', async () => {
    const { queries } = setup(EXAM_TEAM)
    const result = await attachFileToRecord('school_entrance_exam_paper', 'exam-1', 'school-1', formWithFile())
    expect(result).toEqual({ success: true, data: { id: 'new-1' } })
    const insert = queries.find(q => used(q, 'insert'))!.calls.find(c => c.method === 'insert')!.args[0] as Record<string, unknown>
    expect(insert).toMatchObject({ category_id: 7, attachable_type: 'school_entrance_exams', attachable_id: 'exam-1' })
  })

  it('lets the exam team attach a paper link and remove a record\'s papers', async () => {
    setup(EXAM_TEAM)
    expect(await attachLinkToRecord('school_entrance_exam_paper', 'exam-1', 'school-1', 'https://example.com/p.pdf')).toMatchObject({ success: true })
    expect(await deleteAttachmentsForRecord('school_entrance_exam_paper', 'exam-1', 'school-1')).toEqual({ success: true })
  })

  it('keeps ordinary school attach points on the Schools write right', async () => {
    const { queries } = setup(['schools:1', 'schools:2'])
    expect(await attachFileToRecord('school_note', 'note-1', 'school-1', formWithFile())).toMatchObject({ success: true })
    expect(await attachLinkToRecord('school_fee', 'fee-1', 'school-1', 'https://example.com/f')).toMatchObject({ success: true })
    expect(await deleteAttachmentsForRecord('school_bank_detail', 'bank-1', 'school-1')).toEqual({ success: true })
    expect(queries.length).toBeGreaterThan(0)
  })

  it('still refuses an ordinary school attach point without the Schools write right', async () => {
    setup(['schools:1', 'exams:1', 'exams:2'])
    expect(await attachLinkToRecord('school_note', 'note-1', 'school-1', 'https://example.com/f')).toEqual(DENIED)
  })
})
