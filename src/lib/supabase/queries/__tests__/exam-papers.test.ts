import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callsOf, makeSupabaseStub, type Recorded } from './supabase-stub'

const state = vi.hoisted(() => ({ client: null as unknown }))

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({})) }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => state.client) }))

import { getExamPaperStatuses, getSchoolExamPaperOptions } from '../exam-papers'

type Result = { data: unknown; error: unknown }

function setup(respond: (rec: Recorded) => Result) {
  const stub = makeSupabaseStub(respond)
  state.client = stub.supabase
  return stub
}

const papers = (...rows: { id: string; paper_request_from_school?: boolean }[]) =>
  rows.map(row => ({ paper_request_from_school: false, ...row }))

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

/** The statuses of a lookup that is expected to succeed. */
async function statusesOf(ids: string[]) {
  const statuses = await getExamPaperStatuses(ids)
  if (!statuses) throw new Error('the status lookup failed')
  return statuses
}

describe('getExamPaperStatuses', () => {
  it('returns an empty map without querying when there are no ids', async () => {
    const { queries } = setup(() => ({ data: [], error: null }))
    expect((await statusesOf([])).size).toBe(0)
    expect(queries).toHaveLength(0)
  })

  it('queries a repeated id once', async () => {
    const { queries } = setup(rec => ({ data: rec.table === 'school_entrance_exams' ? papers({ id: 'p1' }) : [], error: null }))
    await statusesOf(['p1', 'p1', 'p1'])
    const paperQuery = queries.find(q => q.table === 'school_entrance_exams')!
    expect(callsOf(paperQuery, 'in')).toEqual([['id', ['p1']]])
    expect(queries).toHaveLength(2)
  })

  it('counts stored files and bare links per paper', async () => {
    const attachments = [
      { attachable_id: 'p1', file_path: 'a/1.pdf' },
      { attachable_id: 'p1', file_path: 'a/2.pdf' },
      { attachable_id: 'p1', file_path: null },
      { attachable_id: 'p2', file_path: null },
    ]
    setup(rec => ({ data: rec.table === 'school_documents' ? attachments : papers({ id: 'p1' }, { id: 'p2' }, { id: 'p3' }), error: null }))
    const statuses = await statusesOf(['p1', 'p2', 'p3'])
    expect(statuses.get('p1')).toEqual({ requestFromSchool: false, files: 2, links: 1 })
    expect(statuses.get('p2')).toEqual({ requestFromSchool: false, files: 0, links: 1 })
    expect(statuses.get('p3')).toEqual({ requestFromSchool: false, files: 0, links: 0 })
  })

  it('ignores an attachment whose paper row is missing', async () => {
    setup(rec => ({
      data: rec.table === 'school_documents'
        ? [{ attachable_id: 'gone', file_path: 'a/1.pdf' }, { attachable_id: null, file_path: 'a/2.pdf' }]
        : papers({ id: 'p1' }),
      error: null,
    }))
    const statuses = await statusesOf(['p1', 'gone'])
    expect([...statuses.keys()]).toEqual(['p1'])
    expect(statuses.get('p1')).toEqual({ requestFromSchool: false, files: 0, links: 0 })
  })

  it('carries the request-from-school flag', async () => {
    setup(rec => ({ data: rec.table === 'school_documents' ? [] : papers({ id: 'p1', paper_request_from_school: true }), error: null }))
    expect((await statusesOf(['p1'])).get('p1')?.requestFromSchool).toBe(true)
  })

  it('returns null when the lookup failed, so a failure cannot be read as "nothing uploaded", and logs it', async () => {
    setup(rec => (rec.table === 'school_documents'
      ? { data: null, error: { message: 'boom' } }
      : { data: papers({ id: 'p1' }), error: null }))
    expect(await getExamPaperStatuses(['p1'])).toBeNull()
    expect(console.error).toHaveBeenCalled()
  })

  it('selects only the owner and path of attachments, never names, titles or urls', async () => {
    const { queries } = setup(() => ({ data: [], error: null }))
    await statusesOf(['p1'])
    const docs = queries.find(q => q.table === 'school_documents')!
    expect(callsOf(docs, 'select')).toEqual([['attachable_id, file_path']])
    expect(callsOf(docs, 'eq')).toEqual([['attachable_type', 'school_entrance_exams']])
    expect(callsOf(docs, 'in')).toEqual([['attachable_id', ['p1']]])
  })
})

describe('getSchoolExamPaperOptions', () => {
  it('filters by school and lists the newest entry year first', async () => {
    const { queries } = setup(() => ({ data: [{ id: 'p1' }], error: null }))
    expect(await getSchoolExamPaperOptions('school-1')).toEqual([{ id: 'p1' }])
    const query = queries[0]
    expect(query.table).toBe('school_entrance_exams')
    expect(callsOf(query, 'eq')).toEqual([['school_id', 'school-1']])
    expect(callsOf(query, 'order')[0]).toEqual(['entry_year', { ascending: false }])
  })

  it('selects format fields only', async () => {
    const { queries } = setup(() => ({ data: [], error: null }))
    await getSchoolExamPaperOptions('school-1')
    const [columns] = callsOf(queries[0], 'select')[0] as [string]
    expect(columns.split(',').map(c => c.trim())).toEqual([
      'id', 'subject', 'year_level', 'entry_year', 'duration_minutes', 'exam_format', 'paper_request_from_school',
    ])
  })

  it('returns an empty list on error', async () => {
    setup(() => ({ data: null, error: { message: 'boom' } }))
    expect(await getSchoolExamPaperOptions('school-1')).toEqual([])
    expect(console.error).toHaveBeenCalled()
  })
})
