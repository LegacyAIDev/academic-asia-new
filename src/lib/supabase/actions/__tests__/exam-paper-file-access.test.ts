import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callsOf, makeSupabaseStub, used, type Recorded } from '../../queries/__tests__/supabase-stub'

const state = vi.hoisted(() => ({ client: null as unknown, rights: new Set<string>() }))
const DENIED = { success: false, error: 'You do not have permission to perform this action.' }

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({})) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => state.client) }))
vi.mock('@/lib/permissions/guard', () => ({
  assertAccess: vi.fn(async (module: string, level = 1) => (state.rights.has(`${module}:${level}`) ? null : DENIED)),
}))

import { getAttachmentSignedUrl } from '../record-attachment-signed-url'
import { deleteAttachment } from '../record-attachments'
import { deleteSchoolDocument, getSchoolDocumentSignedUrl, renameSchoolDocument } from '../school-documents'
import { deleteSchoolEntranceExam } from '../school-entrance-exams'
import { deleteSchool } from '../schools'
import { clearCategoryCodeCache } from '@/lib/supabase/document-categories'

const SCHOOLS_STAFF = ['schools:1', 'schools:2', 'exams:1']
const EXAM_TEAM = [...SCHOOLS_STAFF, 'exams:2']
const PAPER_PATH = 'school-1/school_entrance_exam_paper/1_maths.pdf'
const paperRow = { file_path: PAPER_PATH, attachable_type: 'school_entrance_exams', category: { code: 'school_entrance_exam_paper' } }
const brochureRow = { file_path: 'school-1/school_brochure/2_b.pdf', attachable_type: null, category: { code: 'school_brochure' } }

type Result = { data: unknown; error: unknown; count?: number | null }

function setup(rights: string[], respond: (rec: Recorded) => Result) {
  state.rights = new Set(rights)
  const stub = makeSupabaseStub(respond)
  state.client = stub.supabase
  return stub
}

const eqValue = (rec: Recorded, column: string) => callsOf(rec, 'eq').find(args => args[0] === column)?.[1]
const signed = (calls: { method: string; args: unknown[] }[]) => calls.filter(c => c.method === 'createSignedUrl').map(c => c.args)
const removed = (calls: { method: string }[]) => calls.filter(c => c.method === 'remove')

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  clearCategoryCodeCache()
})
afterEach(() => vi.restoreAllMocks())

describe('getAttachmentSignedUrl', () => {
  const storedPaper = { file_path: PAPER_PATH, attachable_type: 'school_entrance_exams' }
  // Stands in for the database: the rows that name the requested path.
  const lookup = (rec: Recorded): Result => ({ data: eqValue(rec, 'file_path') === PAPER_PATH ? [storedPaper] : [], error: null })

  it('refuses a paper to staff outside the exam team before looking anything up', async () => {
    const { queries, storageCalls } = setup(SCHOOLS_STAFF, lookup)
    expect(await getAttachmentSignedUrl('school_entrance_exam_paper', PAPER_PATH)).toEqual(DENIED)
    expect(queries).toHaveLength(0)
    expect(storageCalls).toHaveLength(0)
  })

  it('does not sign a paper path smuggled in under an attach point with looser rights', async () => {
    const { storageCalls } = setup(SCHOOLS_STAFF, lookup)
    const result = await getAttachmentSignedUrl('school_fee', PAPER_PATH)
    expect(result).toEqual({ success: false, error: 'File not found' })
    expect(storageCalls).toHaveLength(0)
  })

  it('does not sign a path that is not stored at all', async () => {
    const { storageCalls } = setup(EXAM_TEAM, lookup)
    const result = await getAttachmentSignedUrl('school_entrance_exam_paper', 'school-1/school_entrance_exam_paper/guess.pdf')
    expect(result.success).toBe(false)
    expect(storageCalls).toHaveLength(0)
  })

  it('signs a paper for the exam team with a five-minute link', async () => {
    const { storageCalls } = setup(EXAM_TEAM, lookup)
    const result = await getAttachmentSignedUrl('school_entrance_exam_paper', PAPER_PATH)
    expect(result).toEqual({ success: true, data: { url: `signed:${PAPER_PATH}` } })
    expect(signed(storageCalls)).toEqual([[PAPER_PATH, 300]])
  })

  it('keeps the one-hour link for ordinary attachments', async () => {
    const feePath = 'school-1/school_fee_schedule/3_fees.pdf'
    const { storageCalls } = setup(['schools:1'], () => ({ data: [{ file_path: feePath, attachable_type: 'school_fees' }], error: null }))
    expect((await getAttachmentSignedUrl('school_fee', feePath)).success).toBe(true)
    expect(signed(storageCalls)).toEqual([[feePath, 3600]])
  })

  it('refuses when more rows name the path than the lookup can check', async () => {
    const many = Array.from({ length: 21 }, () => ({ file_path: PAPER_PATH, attachable_type: 'school_fees' }))
    const { storageCalls } = setup(SCHOOLS_STAFF, () => ({ data: many, error: null }))
    expect(await getAttachmentSignedUrl('school_fee', PAPER_PATH)).toEqual({ success: false, error: 'File not found' })
    expect(storageCalls).toHaveLength(0)
  })

  it('refuses a file that a fee attachment and a paper both point at', async () => {
    const shared = [{ file_path: PAPER_PATH, attachable_type: 'school_fees' }, storedPaper]
    const { storageCalls } = setup(SCHOOLS_STAFF, () => ({ data: shared, error: null }))
    expect(await getAttachmentSignedUrl('school_fee', PAPER_PATH)).toEqual({ success: false, error: 'File not found' })
    expect(storageCalls).toHaveLength(0)
  })
})

describe('deleteAttachment', () => {
  it('refuses to remove a paper for staff outside the exam team', async () => {
    const { queries } = setup(SCHOOLS_STAFF, () => ({ data: { file_path: PAPER_PATH }, error: null }))
    expect(await deleteAttachment('school_entrance_exam_paper', 'doc-1', 'school-1')).toEqual(DENIED)
    expect(queries).toHaveLength(0)
  })

  it('only removes an attachment that belongs to the attach point it was called with', async () => {
    // A paper id sent under the fee attach point: the lookup is narrowed to fee attachments and finds nothing.
    const { queries, storageCalls } = setup(SCHOOLS_STAFF, rec => ({
      data: eqValue(rec, 'attachable_type') === 'school_entrance_exams' ? { file_path: PAPER_PATH } : null, error: null,
    }))
    expect(await deleteAttachment('school_fee', 'doc-1', 'school-1')).toEqual({ success: false, error: 'Attachment not found' })
    expect(queries.some(q => used(q, 'delete'))).toBe(false)
    expect(removed(storageCalls)).toHaveLength(0)
  })

  it('removes the row and the stored file for the exam team', async () => {
    const { queries, storageCalls } = setup(EXAM_TEAM, () => ({ data: { file_path: PAPER_PATH }, error: null }))
    expect(await deleteAttachment('school_entrance_exam_paper', 'doc-1', 'school-1')).toEqual({ success: true })
    expect(queries.filter(q => used(q, 'delete'))).toHaveLength(1)
    expect(removed(storageCalls)).toHaveLength(1)
  })
})

describe('school Documents tab actions', () => {
  const find = (...rows: unknown[]) => (rec: Recorded): Result => ({ data: used(rec, 'select') ? rows : null, error: null })
  const NOT_FOUND = { success: false, error: 'Document not found' }

  it('does not sign a path that is not a stored document', async () => {
    const { storageCalls } = setup(EXAM_TEAM, find())
    expect(await getSchoolDocumentSignedUrl('school-1/anything/x.pdf')).toEqual(NOT_FOUND)
    expect(storageCalls).toHaveLength(0)
  })

  it('answers a paper path exactly like a missing one for staff outside the exam team', async () => {
    const { storageCalls } = setup(SCHOOLS_STAFF, find(paperRow))
    expect(await getSchoolDocumentSignedUrl(PAPER_PATH)).toEqual(NOT_FOUND)
    expect(storageCalls).toHaveLength(0)
  })

  it('treats a file as a paper when any document pointing at it is one', async () => {
    const { storageCalls } = setup(SCHOOLS_STAFF, find({ ...brochureRow, file_path: PAPER_PATH }, paperRow))
    expect(await getSchoolDocumentSignedUrl(PAPER_PATH)).toEqual(NOT_FOUND)
    expect(storageCalls).toHaveLength(0)
  })

  it('signs a paper for the exam team with a five-minute link, and other documents for an hour', async () => {
    const paper = setup(EXAM_TEAM, find(paperRow))
    expect((await getSchoolDocumentSignedUrl(PAPER_PATH)).success).toBe(true)
    expect(signed(paper.storageCalls)).toEqual([[PAPER_PATH, 300]])

    const brochure = setup(['schools:1'], find(brochureRow))
    expect((await getSchoolDocumentSignedUrl(brochureRow.file_path)).success).toBe(true)
    expect(signed(brochure.storageCalls)).toEqual([[brochureRow.file_path, 3600]])
  })

  it('refuses when more documents name the path than the lookup can check', async () => {
    const many = Array.from({ length: 21 }, () => ({ ...brochureRow, file_path: PAPER_PATH }))
    const { storageCalls } = setup(SCHOOLS_STAFF, find(...many))
    expect((await getSchoolDocumentSignedUrl(PAPER_PATH)).success).toBe(false)
    expect(storageCalls).toHaveLength(0)
  })

  it('refuses rather than signs when the document could not be looked up', async () => {
    const { storageCalls } = setup(SCHOOLS_STAFF, () => ({ data: null, error: { message: 'connection lost' } }))
    expect((await getSchoolDocumentSignedUrl(PAPER_PATH)).success).toBe(false)
    expect(storageCalls).toHaveLength(0)
  })

  it('refuses to delete or rename a paper for staff outside the exam team', async () => {
    const del = setup(SCHOOLS_STAFF, find(paperRow))
    expect(await deleteSchoolDocument('doc-1', 'school-1')).toEqual(DENIED)
    expect(del.queries.some(q => used(q, 'delete'))).toBe(false)
    expect(removed(del.storageCalls)).toHaveLength(0)

    const rename = setup(SCHOOLS_STAFF, find(paperRow))
    expect(await renameSchoolDocument('doc-1', 'school-1', 'renamed')).toEqual(DENIED)
    expect(rename.queries.some(q => used(q, 'update'))).toBe(false)
  })

  it('refuses rather than deletes when the document could not be looked up', async () => {
    const { queries } = setup(SCHOOLS_STAFF, () => ({ data: null, error: { message: 'connection lost' } }))
    expect((await deleteSchoolDocument('doc-1', 'school-1')).success).toBe(false)
    expect(queries.some(q => used(q, 'delete'))).toBe(false)
  })

  it('still lets Schools staff delete and rename ordinary documents', async () => {
    const del = setup(SCHOOLS_STAFF, find(brochureRow))
    expect(await deleteSchoolDocument('doc-2', 'school-1')).toEqual({ success: true })
    expect(del.queries.filter(q => used(q, 'delete'))).toHaveLength(1)

    const rename = setup(SCHOOLS_STAFF, find(brochureRow))
    expect(await renameSchoolDocument('doc-2', 'school-1', 'Brochure 2027')).toEqual({ success: true })
    expect(rename.queries.filter(q => used(q, 'update'))).toHaveLength(1)
  })
})

describe('deleteSchoolEntranceExam', () => {
  const withPapers = (count: number | null) => (rec: Recorded): Result =>
    rec.table === 'school_documents' ? { data: null, error: null, count } : { data: null, error: null }
  const examDeleted = (queries: Recorded[]) => queries.some(q => q.table === 'school_entrance_exams' && used(q, 'delete'))

  it('refuses when the exam has papers and the user is outside the exam team', async () => {
    const { queries, storageCalls } = setup(SCHOOLS_STAFF, withPapers(2))
    const result = await deleteSchoolEntranceExam('exam-1', 'school-1')
    expect(result).toEqual({ success: false, error: 'This exam has papers attached. Ask the examination team to remove it.' })
    expect(examDeleted(queries)).toBe(false)
    expect(removed(storageCalls)).toHaveLength(0)
  })

  it('refuses when it cannot tell whether the exam has papers', async () => {
    const { queries } = setup(SCHOOLS_STAFF, withPapers(null))
    expect((await deleteSchoolEntranceExam('exam-1', 'school-1')).success).toBe(false)
    expect(examDeleted(queries)).toBe(false)
  })

  it('lets Schools staff delete an exam that has no papers', async () => {
    const { queries } = setup(SCHOOLS_STAFF, withPapers(0))
    expect(await deleteSchoolEntranceExam('exam-1', 'school-1')).toEqual({ success: true })
    expect(examDeleted(queries)).toBe(true)
  })

  it('removes the papers together with the exam for the exam team', async () => {
    const { queries, storageCalls } = setup(EXAM_TEAM, rec =>
      rec.table === 'school_documents' && !used(rec, 'delete')
        ? { data: [{ id: 'doc-1', file_path: PAPER_PATH }], error: null }
        : { data: null, error: null })
    expect(await deleteSchoolEntranceExam('exam-1', 'school-1')).toEqual({ success: true })
    expect(queries.some(q => q.table === 'school_documents' && used(q, 'delete'))).toBe(true)
    expect(removed(storageCalls)).toHaveLength(1)
    expect(examDeleted(queries)).toBe(true)
  })
})

describe('deleteSchool', () => {
  // The paper category resolves to id 7; `papers` is how many paper rows the school holds.
  const school = (papers: number | null, categories: unknown = [{ id: 7, code: 'school_entrance_exam_paper' }]) =>
    (rec: Recorded): Result => {
      if (rec.table === 'document_categories') return { data: categories, error: null }
      if (rec.table === 'school_documents') return { data: null, error: null, count: papers }
      return { data: null, error: null }
    }
  const schoolDeleted = (queries: Recorded[]) => queries.some(q => q.table === 'schools' && used(q, 'delete'))
  const REFUSED = { success: false, error: 'This school has exam papers. Ask the examination team to remove them first.' }

  it('refuses when the school holds papers and the user is outside the exam team', async () => {
    const { queries, storageCalls } = setup(SCHOOLS_STAFF, school(3))
    expect(await deleteSchool('school-1')).toEqual(REFUSED)
    expect(schoolDeleted(queries)).toBe(false)
    expect(storageCalls).toHaveLength(0)
  })

  it('counts papers by the exam they hang off and by their category', async () => {
    const { queries } = setup(SCHOOLS_STAFF, school(3))
    await deleteSchool('school-1')
    const count = queries.find(q => q.table === 'school_documents')!
    expect(callsOf(count, 'eq')).toEqual([['school_id', 'school-1']])
    expect(callsOf(count, 'or')).toEqual([['attachable_type.eq.school_entrance_exams,category_id.eq.7']])
  })

  it('refuses when it cannot tell whether the school holds papers', async () => {
    const unknownCount = setup(SCHOOLS_STAFF, school(null))
    expect(await deleteSchool('school-1')).toEqual(REFUSED)
    expect(schoolDeleted(unknownCount.queries)).toBe(false)

    clearCategoryCodeCache()
    const unknownCategory = setup(SCHOOLS_STAFF, school(0, null))
    expect(await deleteSchool('school-1')).toEqual(REFUSED)
    expect(schoolDeleted(unknownCategory.queries)).toBe(false)
  })

  it('lets Schools staff delete a school that holds no papers', async () => {
    const { queries } = setup(SCHOOLS_STAFF, school(0))
    expect(await deleteSchool('school-1')).toEqual({ success: true })
    expect(schoolDeleted(queries)).toBe(true)
  })

  it('lets the exam team delete a school together with its papers, without counting first', async () => {
    const { queries } = setup(EXAM_TEAM, school(3))
    expect(await deleteSchool('school-1')).toEqual({ success: true })
    expect(queries.some(q => q.table === 'school_documents')).toBe(false)
    expect(schoolDeleted(queries)).toBe(true)
  })
})
