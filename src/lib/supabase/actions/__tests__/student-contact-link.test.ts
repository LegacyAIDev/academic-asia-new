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
vi.mock('@/lib/supabase/actions/record-attachments', () => ({ purgeOwnerStorage: vi.fn() }))

import { revalidatePath } from 'next/cache'
import { createStudentContact, deleteStudentContact, updateStudentContact } from '../students'
import { searchStudentsForFamilyAction } from '../student-family'

type Result = { data: unknown; error: unknown }
const sibling = { id: 's2', student_code: 'S046020', first_name: 'Edward', surname: 'CHAN', chinese_name: null, gender: 'M', date_of_birth: null, present_school: null }

type Responses = { lookup?: Result; current?: Result; write?: Result }

/** Answers the linked-student lookup, the read of the contact being edited, and the write separately. */
function setup({
  lookup = { data: sibling, error: null },
  current = { data: { related_student_id: null }, error: null },
  write = { data: { id: 'c1' }, error: null },
}: Responses = {}) {
  state.rights = new Set(['students:1', 'students:2'])
  const stub = makeSupabaseStub((rec: Recorded) => {
    if (rec.table === 'students') return lookup
    return used(rec, 'insert') || used(rec, 'update') || used(rec, 'delete') ? write : current
  })
  state.client = stub.supabase
  return stub.queries
}

const revalidated = () => vi.mocked(revalidatePath).mock.calls.map(([path]) => path)

const written = (queries: Recorded[], method: 'insert' | 'update') =>
  callsOf(queries.find((q) => q.table === 'student_contacts' && used(q, method))!, method)[0][0] as Record<string, unknown>

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.mocked(revalidatePath).mockClear()
})

describe('linking a family member to a student', () => {
  it('copies the student\'s name and gender into the row and refreshes both students', async () => {
    const queries = setup()
    const result = await createStudentContact({ student_id: 's1', relationship_id: 4, related_student_id: 's2', surname: 'typed', first_name: 'typed' })
    expect(result).toEqual({ success: true, data: { id: 'c1' } })
    expect(callsOf(queries[0], 'eq')).toEqual([['id', 's2']])
    expect(written(queries, 'insert')).toMatchObject({ related_student_id: 's2', surname: 'CHAN', first_name: 'Edward', gender: 'M', relationship_id: 4 })
    expect(revalidated()).toEqual(['/students/s1', '/students/s2'])
  })

  it('re-points a link, refreshing the old and the new student, and never moves the contact', async () => {
    const queries = setup({ current: { data: { related_student_id: 's3' }, error: null } })
    const sneaky = { related_student_id: 's2', student_id: 'other', created_by: 'someone' } as never
    expect(await updateStudentContact('c1', 's1', sneaky)).toEqual({ success: true })

    expect(callsOf(queries[0], 'eq')).toEqual([['id', 'c1'], ['student_id', 's1']])
    const update = written(queries, 'update')
    expect(update).toMatchObject({ related_student_id: 's2', surname: 'CHAN', first_name: 'Edward', gender: 'M' })
    expect(update).not.toHaveProperty('student_id')
    expect(update).not.toHaveProperty('created_by')
    expect(callsOf(queries.find((q) => used(q, 'update'))!, 'eq')).toEqual([['id', 'c1'], ['student_id', 's1']])
    expect(revalidated()).toEqual(['/students/s1', '/students/s3', '/students/s2'])
  })

  it('refuses to edit a contact of another student', async () => {
    const queries = setup({ current: { data: null, error: null } })
    expect(await updateStudentContact('c1', 's1', { surname: 'X' })).toEqual({ success: false, error: 'Contact not found' })
    expect(queries.some((q) => used(q, 'update'))).toBe(false)
  })

  it('refuses the student themself and a student that no longer exists', async () => {
    let queries = setup()
    expect(await createStudentContact({ student_id: 's1', related_student_id: 's1' }))
      .toEqual({ success: false, error: 'A student cannot be their own family member' })
    expect(queries).toHaveLength(0)

    queries = setup({ lookup: { data: null, error: null } })
    expect(await updateStudentContact('c1', 's1', { related_student_id: 'gone' }))
      .toEqual({ success: false, error: 'That student no longer exists. Choose another one.' })
    expect(queries.some((q) => used(q, 'update'))).toBe(false)
  })

  it('says so when the same student is already linked, and passes other failures on', async () => {
    setup({ write: { data: null, error: { code: '23505', message: 'duplicate key' } } })
    expect(await updateStudentContact('c1', 's1', { related_student_id: 's2' }))
      .toEqual({ success: false, error: 'This student is already linked as a family member' })
    expect(await createStudentContact({ student_id: 's1', related_student_id: 's2' }))
      .toEqual({ success: false, error: 'This student is already linked as a family member' })

    setup({ write: { data: null, error: { code: '42501', message: 'permission denied' } } })
    expect(await createStudentContact({ student_id: 's1', related_student_id: 's2' }))
      .toEqual({ success: false, error: 'permission denied' })
  })

  it('needs Students write access to link', async () => {
    const queries = setup()
    state.rights = new Set(['students:1'])
    expect(await createStudentContact({ student_id: 's1', related_student_id: 's2' })).toEqual(DENIED)
    expect(queries).toHaveLength(0)
  })

  it('reports a failed lookup as a failed save', async () => {
    setup({ lookup: { data: null, error: { message: 'timeout' } } })
    expect(await createStudentContact({ student_id: 's1', related_student_id: 's2' }))
      .toEqual({ success: false, error: 'Failed to create contact' })
  })

  it('removes a link without touching the typed name, and leaves the link alone when not sent', async () => {
    let queries = setup()
    await updateStudentContact('c1', 's1', { related_student_id: '', surname: 'CHAN' })
    expect(queries.some((q) => q.table === 'students')).toBe(false)
    expect(written(queries, 'update')).toEqual({ related_student_id: null, surname: 'CHAN' })

    queries = setup()
    await updateStudentContact('c1', 's1', { mobile: '+852 9000 0000', related_student_id: undefined })
    expect(queries.some((q) => q.table === 'students')).toBe(false)
    expect(written(queries, 'update')).toEqual({ mobile: '+852 9000 0000' })
  })

  it('refreshes the linked student\'s page when a linked contact is deleted', async () => {
    const queries = setup({ write: { data: [{ related_student_id: 's2' }], error: null } })
    expect(await deleteStudentContact('c1', 's1')).toEqual({ success: true })
    expect(callsOf(queries[0], 'eq')).toEqual([['id', 'c1'], ['student_id', 's1']])
    expect(revalidated()).toEqual(['/students/s1', '/students/s2'])
  })
})

describe('searchStudentsForFamilyAction', () => {
  it('needs Students read access', async () => {
    setup()
    state.rights = new Set()
    expect(await searchStudentsForFamilyAction('chan', 's1')).toEqual(DENIED)
  })

  it('returns the matching students', async () => {
    const stub = makeSupabaseStub(() => ({ data: [sibling], error: null }))
    state.rights = new Set(['students:1'])
    state.client = stub.supabase
    expect(await searchStudentsForFamilyAction('chan', 's1')).toEqual({ success: true, data: [sibling] })
    expect(await searchStudentsForFamilyAction(42 as never, 's1')).toEqual({ success: false, error: 'Invalid search' })
  })

  it('reports a failed search instead of an empty result', async () => {
    const stub = makeSupabaseStub(() => ({ data: null, error: { message: 'timeout' } }))
    state.rights = new Set(['students:1'])
    state.client = stub.supabase
    expect(await searchStudentsForFamilyAction('chan', 's1')).toEqual({ success: false, error: 'Failed to search students' })
  })
})
