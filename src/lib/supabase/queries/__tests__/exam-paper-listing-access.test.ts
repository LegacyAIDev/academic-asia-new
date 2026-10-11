import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callsOf, makeSupabaseStub } from './supabase-stub'

const state = vi.hoisted(() => ({ client: null as unknown, rights: new Set<string>() }))

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({})) }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => state.client) }))
vi.mock('@/lib/permissions/guard', () => ({
  canAccess: vi.fn(async (module: string, level = 1) => state.rights.has(`${module}:${level}`)),
}))

import { getAttachmentsForMany } from '../record-attachments'
import { getSchoolDocuments } from '../school-documents'

const SCHOOLS_STAFF = ['schools:1', 'schools:2', 'exams:1']
const EXAM_TEAM = [...SCHOOLS_STAFF, 'exams:2']

function setup(rights: string[], rows: unknown[] = []) {
  state.rights = new Set(rights)
  const stub = makeSupabaseStub(() => ({ data: rows, error: null }))
  state.client = stub.supabase
  return stub.queries
}

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
afterEach(() => vi.restoreAllMocks())

describe('getAttachmentsForMany - who may list exam papers', () => {
  const paper = { id: 'doc-1', file_name: 'maths.pdf', file_path: 's/school_entrance_exam_paper/1_maths.pdf', attachable_id: 'exam-1' }

  it('returns nothing, without even asking the database, for staff outside the exam team', async () => {
    const queries = setup(SCHOOLS_STAFF, [paper])
    const result = await getAttachmentsForMany('school_entrance_exam_paper', ['exam-1'])
    expect(result.size).toBe(0)
    expect(queries).toHaveLength(0)
  })

  it('does not treat the Exams read right as enough', async () => {
    const queries = setup(['schools:1', 'schools:2', 'exams:1'], [paper])
    expect((await getAttachmentsForMany('school_entrance_exam_paper', ['exam-1'])).size).toBe(0)
    expect(queries).toHaveLength(0)
  })

  it('lists the papers of the given exams for the exam team', async () => {
    const queries = setup(EXAM_TEAM, [paper])
    const result = await getAttachmentsForMany('school_entrance_exam_paper', ['exam-1'])
    expect(result.get('exam-1')?.map(a => a.file_name)).toEqual(['maths.pdf'])
    expect(queries[0].table).toBe('school_documents')
    expect(callsOf(queries[0], 'eq')).toEqual([['attachable_type', 'school_entrance_exams']])
    expect(callsOf(queries[0], 'in')).toEqual([['attachable_id', ['exam-1']]])
  })

  it('keeps ordinary school attachments on the Schools read right', async () => {
    const queries = setup(['schools:1'], [{ id: 'doc-2', file_name: 'fees.pdf', attachable_id: 'fee-1' }])
    const result = await getAttachmentsForMany('school_fee', ['fee-1'])
    expect(result.get('fee-1')).toHaveLength(1)
    expect(callsOf(queries[0], 'eq')).toEqual([['attachable_type', 'school_fees']])
  })

  it('returns nothing for ordinary attachments when the user may not read the owner at all', async () => {
    const queries = setup(['exams:2'], [{ id: 'doc-2', attachable_id: 'fee-1' }])
    expect((await getAttachmentsForMany('school_fee', ['fee-1'])).size).toBe(0)
    expect(queries).toHaveLength(0)
  })
})

describe('getSchoolDocuments - the Documents tab', () => {
  const rows = [
    { id: 'prospectus', attachable_type: null, category: { id: 1, code: 'school_prospectus', label: 'Prospectus' } },
    { id: 'paper-by-category', attachable_type: null, category: { id: 2, code: 'school_entrance_exam_paper', label: 'Exam paper' } },
    { id: 'paper-by-record', attachable_type: 'school_entrance_exams', category: { id: 3, code: 'other', label: 'Other' } },
    { id: 'fee-schedule', attachable_type: 'school_fees', category: { id: 4, code: 'school_fee_schedule', label: 'Fees' } },
  ]

  it('leaves every exam paper out for staff outside the exam team', async () => {
    setup(SCHOOLS_STAFF, rows)
    expect((await getSchoolDocuments('school-1')).map(d => d.id)).toEqual(['prospectus', 'fee-schedule'])
  })

  it('shows everything to the exam team', async () => {
    setup(EXAM_TEAM, rows)
    expect((await getSchoolDocuments('school-1')).map(d => d.id))
      .toEqual(['prospectus', 'paper-by-category', 'paper-by-record', 'fee-schedule'])
  })
})
