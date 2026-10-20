import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { revalidatePath } from 'next/cache'
import { callsOf, makeSupabaseStub, used, type Recorded } from '../../queries/__tests__/supabase-stub'

const state = vi.hoisted(() => ({ client: null as unknown, rights: new Set<string>() }))
const DENIED = { success: false, error: 'You do not have permission to perform this action.' }

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({})) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => state.client) }))
vi.mock('@/lib/permissions/guard', () => ({
  canAccess: vi.fn(async (module: string, level = 1) => state.rights.has(`${module}:${level}`)),
  assertAccess: vi.fn(async (module: string, level = 1) => (state.rights.has(`${module}:${level}`) ? null : DENIED)),
}))

import { updateStudentApplication } from '../student-applications'
import { getStudentApplicationById } from '../../queries/student-applications'
import { getApplicationBookings } from '../../queries/application-bookings'
import { getApplicationStatusHistory } from '../../queries/application-status-history'

type Result = { data: unknown; error: unknown }

const APP = '11111111-1111-4111-8111-111111111111'
const STUDENT = '22222222-2222-4222-8222-222222222222'

function setup(rights: string[], respond: (rec: Recorded) => Result) {
  state.rights = new Set(rights)
  const stub = makeSupabaseStub(respond)
  state.client = stub.supabase
  return stub
}

beforeEach(() => {
  vi.mocked(revalidatePath).mockClear()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('updateStudentApplication', () => {
  it('needs Students write access', async () => {
    const { queries } = setup(['students:1'], () => ({ data: [{ id: APP }], error: null }))
    expect(await updateStudentApplication(APP, STUDENT, { status_id: 17 })).toEqual(DENIED)
    expect(queries).toHaveLength(0)
  })

  it('saves status and sub-status of that application, only within the given student', async () => {
    const { queries } = setup(['students:1', 'students:2'], () => ({ data: [{ id: APP }], error: null }))
    expect(await updateStudentApplication(APP, STUDENT, { status_id: 17, sub_status_id: null })).toEqual({ success: true })
    expect(queries).toHaveLength(1)
    expect(queries[0].table).toBe('student_applications')
    expect(callsOf(queries[0], 'update')).toEqual([[{ status_id: 17, sub_status_id: null }]])
    expect(callsOf(queries[0], 'eq')).toEqual([['id', APP], ['student_id', STUDENT]])
  })

  it('refreshes the student page and the application page', async () => {
    setup(['students:1', 'students:2'], () => ({ data: [{ id: APP }], error: null }))
    await updateStudentApplication(APP, STUDENT, { status_id: 17 })
    expect(vi.mocked(revalidatePath).mock.calls).toEqual([
      [`/students/${STUDENT}`],
      [`/students/${STUDENT}/applications/${APP}`],
    ])
  })

  it('reports an application that is not the student\'s as not found', async () => {
    setup(['students:1', 'students:2'], () => ({ data: [], error: null }))
    expect(await updateStudentApplication(APP, STUDENT, { status_id: 17 })).toEqual({ success: false, error: 'Application not found' })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('never moves an application to another student, even when a crafted call asks for it', async () => {
    const { queries } = setup(['students:1', 'students:2'], () => ({ data: [{ id: APP }], error: null }))
    const crafted = { status_id: 17, student_id: 'someone-else' } as unknown as Parameters<typeof updateStudentApplication>[2]
    expect(await updateStudentApplication(APP, STUDENT, crafted)).toEqual({ success: true })
    expect(callsOf(queries[0], 'update')).toEqual([[{ status_id: 17 }]])
  })

  it('does not query for ids that are not uuids', async () => {
    const { queries } = setup(['students:1', 'students:2'], () => ({ data: [{ id: APP }], error: null }))
    expect(await updateStudentApplication('abc', STUDENT, { status_id: 17 })).toEqual({ success: false, error: 'Application not found' })
    expect(queries).toHaveLength(0)
  })

  it('passes a database error on', async () => {
    setup(['students:1', 'students:2'], () => ({ data: null, error: { message: 'violates foreign key constraint' } }))
    expect(await updateStudentApplication(APP, STUDENT, { sub_status_id: 999 }))
      .toEqual({ success: false, error: 'violates foreign key constraint' })
  })
})

describe('getStudentApplicationById', () => {
  it('asks for the application within the student and with its sub-status', async () => {
    const { queries } = setup([], () => ({ data: { id: APP }, error: null }))
    expect(await getStudentApplicationById(APP, STUDENT)).toEqual({ id: APP })
    expect(callsOf(queries[0], 'eq')).toEqual([['id', APP], ['student_id', STUDENT]])
    expect(used(queries[0], 'maybeSingle')).toBe(true)
    expect(String(callsOf(queries[0], 'select')[0][0])).toContain('sub_status:application_sub_statuses')
  })

  it('does not query for ids that are not uuids', async () => {
    const { queries } = setup([], () => ({ data: { id: APP }, error: null }))
    expect(await getStudentApplicationById('abc', STUDENT)).toBeNull()
    expect(await getStudentApplicationById(APP, '1 or 1=1')).toBeNull()
    expect(queries).toHaveLength(0)
  })

  it('returns null when nothing matches or the query fails', async () => {
    setup([], () => ({ data: null, error: null }))
    expect(await getStudentApplicationById(APP, STUDENT)).toBeNull()
    setup([], () => ({ data: null, error: { message: 'boom' } }))
    expect(await getStudentApplicationById(APP, STUDENT)).toBeNull()
  })
})

describe('getApplicationBookings', () => {
  it('returns nothing without Scheduler read access', async () => {
    const { queries } = setup(['students:1'], () => ({ data: [{ id: 'b1' }], error: null }))
    expect(await getApplicationBookings(APP)).toEqual([])
    expect(queries).toHaveLength(0)
  })

  it('lists the bookings linked to the application, earliest first', async () => {
    const { queries } = setup(['scheduler:1'], () => ({ data: [{ id: 'b1' }], error: null }))
    expect(await getApplicationBookings(APP)).toEqual([{ id: 'b1' }])
    expect(queries[0].table).toBe('scheduler_bookings')
    expect(callsOf(queries[0], 'eq')).toEqual([['application_id', APP]])
    expect(callsOf(queries[0], 'order')).toEqual([['start_at']])
  })

  it('returns an empty list when the query fails', async () => {
    setup(['scheduler:1'], () => ({ data: null, error: { message: 'boom' } }))
    expect(await getApplicationBookings(APP)).toEqual([])
  })
})

describe('getApplicationStatusHistory', () => {
  it('reads the changes of that application newest first, with labels and the name of who made them', async () => {
    const { queries } = setup([], () => ({
      data: [{
        id: 5, changed_at: '2026-10-21T01:30:00Z',
        from_status_id: 7, to_status_id: 17, from_sub_status_id: null, to_sub_status_id: 15,
        from_status: { label: 'Awaiting Offer' }, to_status: { label: 'Offered' },
        from_sub_status: null, to_sub_status: { label: 'Conditional' },
        changed_by: { first_name: 'Jane', surname: 'Lee' },
      }],
      error: null,
    }))
    expect(await getApplicationStatusHistory(APP)).toEqual([{
      id: 5, changed_at: '2026-10-21T01:30:00Z',
      from_status_id: 7, to_status_id: 17, from_sub_status_id: null, to_sub_status_id: 15,
      from_status: 'Awaiting Offer', to_status: 'Offered', from_sub_status: null, to_sub_status: 'Conditional',
      changed_by_name: 'Jane Lee',
    }])
    expect(queries[0].table).toBe('student_application_status_history')
    expect(callsOf(queries[0], 'eq')).toEqual([['application_id', APP]])
    expect(callsOf(queries[0], 'order')).toEqual([['changed_at', { ascending: false }], ['id', { ascending: false }]])
    expect(callsOf(queries[0], 'limit')).toEqual([[100]])
  })

  it('leaves the name empty for a change without a known user', async () => {
    setup([], () => ({
      data: [{
        id: 6, changed_at: '2026-10-21T01:30:00Z', from_status_id: null, to_status_id: 17,
        from_sub_status_id: null, to_sub_status_id: null, from_status: null, to_status: { label: 'Offered' },
        from_sub_status: null, to_sub_status: null, changed_by: null,
      }],
      error: null,
    }))
    const [change] = await getApplicationStatusHistory(APP)
    expect(change.changed_by_name).toBeNull()
  })

  it('returns nothing when the query fails', async () => {
    setup([], () => ({ data: null, error: { message: 'boom' } }))
    expect(await getApplicationStatusHistory(APP)).toEqual([])
  })
})
