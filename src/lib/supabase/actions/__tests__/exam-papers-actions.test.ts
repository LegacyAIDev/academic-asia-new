import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callsOf, makeSupabaseStub, type Recorded } from '../../queries/__tests__/supabase-stub'

const state = vi.hoisted(() => ({ client: null as unknown, rights: new Set<string>() }))
const DENIED = { success: false, error: 'You do not have permission to perform this action.' }

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({})) }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => state.client) }))
vi.mock('@/lib/permissions/guard', () => ({
  assertAccess: vi.fn(async (module: string, level = 1) => (state.rights.has(`${module}:${level}`) ? null : DENIED)),
  canAccess: vi.fn(async (module: string, level = 1) => state.rights.has(`${module}:${level}`)),
}))

import { getBookingPaperFilesAction, getSchoolExamPaperOptionsAction } from '../exam-papers'

const BOOKING = '11111111-1111-4111-8111-111111111111'
const SCHOOL = '22222222-2222-4222-8222-222222222222'
const P_FILE = '33333333-3333-4333-8333-333333333333'
const P_LINK = '44444444-4444-4444-8444-444444444444'
const P_REQUEST = '55555555-5555-4555-8555-555555555555'
const SCHOOLS_STAFF = ['schools:1', 'schools:2', 'exams:1']
const EXAM_TEAM = [...SCHOOLS_STAFF, 'exams:2']
const paper = (id: string, subject: string) => ({ id, subject })

type Result = { data: unknown; error: unknown }

function setup(rights: string[], respond: (rec: Recorded) => Result) {
  state.rights = new Set(rights)
  const stub = makeSupabaseStub(respond)
  state.client = stub.supabase
  return stub
}

/** A booking holding three papers; each paper has the attachments the test gives it. */
function database(options: { snapshot?: unknown; attachments?: unknown[]; requestIds?: string[] } = {}) {
  const snapshot = 'snapshot' in options ? options.snapshot
    : { label: 'x', papers: [paper(P_FILE, 'English'), paper(P_LINK, 'Maths'), paper(P_REQUEST, 'Science')] }
  return (rec: Recorded): Result => {
    if (rec.table === 'scheduler_bookings') return { data: { assessment_snapshot: snapshot, school_id: SCHOOL }, error: null }
    if (rec.table === 'school_entrance_exams') {
      const ids = (callsOf(rec, 'in')[0]?.[1] ?? []) as string[]
      return { data: ids.map(id => ({ id, paper_request_from_school: options.requestIds?.includes(id) ?? false })), error: null }
    }
    return { data: options.attachments ?? [], error: null }
  }
}

const row = (attachable_id: string, extra: object) => ({
  id: `doc-${attachable_id}-${Math.random()}`, file_name: null, file_path: null, file_size: null,
  mime_type: null, external_url: null, title: null, attachable_id, attachable_type: 'school_entrance_exams', ...extra,
})

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('getBookingPaperFilesAction', () => {
  it.each([['Schools staff', SCHOOLS_STAFF], ['Exams read only', ['exams:1']]])('is denied for %s before any query', async (_who, rights) => {
    const { queries, storageCalls } = setup(rights, database())
    expect(await getBookingPaperFilesAction(BOOKING)).toEqual(DENIED)
    expect(queries).toHaveLength(0)
    expect(storageCalls).toHaveLength(0)
  })

  it('refuses an id that is not a uuid without querying', async () => {
    const { queries } = setup(EXAM_TEAM, database())
    expect(await getBookingPaperFilesAction("x' or 1=1")).toEqual({ success: false, error: 'Booking not found' })
    expect(queries).toHaveLength(0)
  })

  it('reports an unknown booking', async () => {
    setup(EXAM_TEAM, rec => ({ data: rec.table === 'scheduler_bookings' ? null : [], error: null }))
    expect(await getBookingPaperFilesAction(BOOKING)).toEqual({ success: false, error: 'Booking not found' })
  })

  it('signs stored files for five minutes and returns subject and name', async () => {
    const { storageCalls } = setup(EXAM_TEAM, database({
      attachments: [row(P_FILE, { file_path: 's/paper.pdf', file_name: 'paper.pdf', title: 'English 2026' })],
    }))
    const result = await getBookingPaperFilesAction(BOOKING)
    expect(result.data?.files).toEqual([
      { paperId: P_FILE, subject: 'English', name: 'English 2026', url: 'signed:s/paper.pdf', kind: 'file' },
    ])
    expect(storageCalls.filter(c => c.method === 'createSignedUrl').map(c => c.args)).toEqual([['s/paper.pdf', 300]])
  })

  it('returns https links but never an unsafe one', async () => {
    setup(EXAM_TEAM, database({
      attachments: [
        row(P_LINK, { external_url: 'javascript:alert(1)', title: 'bad' }),
        row(P_LINK, { external_url: 'data:text/html,hi', title: 'bad2' }),
        row(P_LINK, { external_url: 'https://school.example/test', title: 'Online test' }),
      ],
    }))
    const { files } = (await getBookingPaperFilesAction(BOOKING)).data!
    expect(files).toEqual([
      { paperId: P_LINK, subject: 'Maths', name: 'Online test', url: 'https://school.example/test', kind: 'link' },
    ])
  })

  it('lists a request-from-school paper and returns none of its attachments', async () => {
    const { storageCalls } = setup(EXAM_TEAM, database({
      requestIds: [P_REQUEST],
      attachments: [row(P_REQUEST, { file_path: 's/science.pdf' }), row(P_REQUEST, { external_url: 'https://x.example' })],
    }))
    const { data } = await getBookingPaperFilesAction(BOOKING)
    expect(data?.toRequest).toEqual(['Science'])
    expect(data?.files).toEqual([])
    expect(storageCalls).toHaveLength(0)
  })

  it('reads the papers from the stored booking, taking nothing but the booking id', async () => {
    const { queries } = setup(EXAM_TEAM, database({ snapshot: { label: 'x', papers: [paper(P_LINK, 'Maths'), { id: 'not-a-uuid', subject: 'Junk' }] } }))
    expect(getBookingPaperFilesAction).toHaveLength(1)
    const result = await getBookingPaperFilesAction(BOOKING)
    expect(result.data?.schoolId).toBe(SCHOOL)
    const bookingQuery = queries.find(q => q.table === 'scheduler_bookings')!
    expect(callsOf(bookingQuery, 'eq')).toEqual([['id', BOOKING]])
    const attachmentQuery = queries.find(q => q.table === 'school_documents')!
    expect(callsOf(attachmentQuery, 'in')).toEqual([['attachable_id', [P_LINK]]])
  })

  it('returns no papers for a booking whose snapshot has none', async () => {
    setup(EXAM_TEAM, database({ snapshot: null }))
    expect((await getBookingPaperFilesAction(BOOKING)).data).toEqual({ files: [], toRequest: [], schoolId: SCHOOL })
  })
})

describe('getSchoolExamPaperOptionsAction', () => {
  const option = { id: 'p1', subject: 'English', year_level: 'Year 7', entry_year: '2027', duration_minutes: 60, exam_format: 'Written', paper_request_from_school: false }

  it('needs scheduler read access', async () => {
    const { queries } = setup(['exams:2', 'schools:1'], () => ({ data: [option], error: null }))
    expect(await getSchoolExamPaperOptionsAction(SCHOOL)).toEqual(DENIED)
    expect(queries).toHaveLength(0)
  })

  it('refuses a school id that is not a uuid', async () => {
    const { queries } = setup(['scheduler:1'], () => ({ data: [option], error: null }))
    expect(await getSchoolExamPaperOptionsAction('nope')).toEqual({ success: false, error: 'Unknown school' })
    expect(queries).toHaveLength(0)
  })

  it('returns format fields only, with no file name, path or url', async () => {
    setup(['scheduler:1'], () => ({ data: [option], error: null }))
    const result = await getSchoolExamPaperOptionsAction(SCHOOL)
    expect(result.success).toBe(true)
    for (const item of result.data!) {
      expect(Object.keys(item).filter(key => /file|path|url|title/i.test(key))).toEqual([])
    }
  })
})
