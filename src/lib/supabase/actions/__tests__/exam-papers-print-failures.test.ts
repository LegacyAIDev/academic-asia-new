import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { makeSupabaseStub, type Recorded } from '../../queries/__tests__/supabase-stub'

const state = vi.hoisted(() => ({ client: null as unknown }))

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({})) }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => state.client) }))
// Everyone is in the exam team here: these tests are about what happens when a lookup fails.
vi.mock('@/lib/permissions/guard', () => ({ assertAccess: vi.fn(async () => null), canAccess: vi.fn(async () => true) }))

import { getBookingPaperFilesAction } from '../exam-papers'

const BOOKING = '99999999-9999-4999-8999-999999999999'
const PAPER = '11111111-1111-4111-8111-111111111111'
const PATH = `school-1/school_entrance_exam_paper/1_english.pdf`
const snapshot = { label: 'English', papers: [{ id: PAPER, subject: 'English' }] }
const attachment = { id: 'doc-1', file_name: 'english.pdf', file_path: PATH, attachable_id: PAPER, attachable_type: 'school_entrance_exams', external_url: null, title: null }

type Result = { data: unknown; error: unknown }

function setup(respond: (rec: Recorded) => Result) {
  const stub = makeSupabaseStub(respond)
  state.client = stub.supabase
  return stub
}

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
afterEach(() => vi.restoreAllMocks())

describe('getBookingPaperFilesAction - when a lookup fails', () => {
  it('does not pass a raw database message to the screen when the booking cannot be read', async () => {
    const { storageCalls } = setup(() => ({ data: null, error: { message: 'relation "scheduler_bookings" does not exist' } }))
    expect(await getBookingPaperFilesAction(BOOKING)).toEqual({ success: false, error: 'Failed to load the papers' })
    expect(storageCalls).toHaveLength(0)
  })

  it('lists nothing when the paper states cannot be read, since a "request from school" paper could not be told apart', async () => {
    const { storageCalls } = setup(rec => {
      if (rec.table === 'scheduler_bookings') return { data: { assessment_snapshot: snapshot, school_id: 'school-1' }, error: null }
      if (rec.table === 'school_entrance_exams') return { data: null, error: { message: 'boom' } }
      return { data: [attachment], error: null }
    })
    const result = await getBookingPaperFilesAction(BOOKING)
    expect(result).toEqual({ success: false, error: 'Failed to load the papers' })
    expect(result.data).toBeUndefined()
    expect(storageCalls.filter(call => call.method === 'createSignedUrl')).toHaveLength(0)
  })
})
