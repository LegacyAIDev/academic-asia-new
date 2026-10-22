import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callsOf, makeSupabaseStub } from './supabase-stub'

const state = vi.hoisted(() => ({ client: null as unknown }))

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({})) }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => state.client) }))

import { getFamilyLinksToStudent, getLinkedStudent, searchStudentsForFamily } from '../student-family'
import { getStudentContacts } from '../students'

type Result = { data: unknown; error: unknown }

function setup(result: Result) {
  const stub = makeSupabaseStub(() => result)
  state.client = stub.supabase
  return stub.queries
}

const student = {
  id: 's2', student_code: 'S046020', first_name: 'Edward', surname: 'CHAN',
  chinese_name: '陳大文', gender: 'M', date_of_birth: '2010-03-04', present_school: 'LA SALLE COLLEGE',
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('searchStudentsForFamily', () => {
  it('needs every word somewhere in the names or code, and leaves out the student being edited', async () => {
    const queries = setup({ data: [student], error: null })
    expect(await searchStudentsForFamily('chan edward', 's1')).toEqual([student])
    expect(callsOf(queries[0], 'or')).toEqual([
      ['surname.ilike.%chan%,first_name.ilike.%chan%,chinese_name.ilike.%chan%,student_code.ilike.%chan%'],
      ['surname.ilike.%edward%,first_name.ilike.%edward%,chinese_name.ilike.%edward%,student_code.ilike.%edward%'],
    ])
    expect(callsOf(queries[0], 'neq')).toEqual([['id', 's1']])
    expect(callsOf(queries[0], 'order')).toEqual([['surname'], ['first_name']])
    expect(callsOf(queries[0], 'limit')).toEqual([[20]])
  })

  it('does not ask without a usable word, and throws when the search fails', async () => {
    const queries = setup({ data: [student], error: null })
    expect(await searchStudentsForFamily(' ,() ', 's1')).toEqual([])
    expect(queries).toHaveLength(0)
    setup({ data: null, error: { message: 'timeout' } })
    await expect(searchStudentsForFamily('chan', 's1')).rejects.toThrow('timeout')
  })

  it('caps the words and honours the limit', async () => {
    const queries = setup({ data: [], error: null })
    await searchStudentsForFamily('a b c d e', 's1', 5)
    expect(callsOf(queries[0], 'or')).toHaveLength(4)
    expect(callsOf(queries[0], 'limit')).toEqual([[5]])
  })
})

describe('getFamilyLinksToStudent', () => {
  it('lists the students whose family rows point at this one, with their relationship', async () => {
    const queries = setup({ data: [
      { id: 'c1', relationship: { code: 'brother' }, student },
      { id: 'c2', relationship: null, student: null },
    ], error: null })
    expect(await getFamilyLinksToStudent('s1')).toEqual([{ contactId: 'c1', relationshipCode: 'brother', student }])
    expect(callsOf(queries[0], 'eq')).toEqual([['related_student_id', 's1']])
  })

  it('returns nothing when the read fails', async () => {
    setup({ data: null, error: { message: 'timeout' } })
    expect(await getFamilyLinksToStudent('s1')).toEqual([])
  })
})

describe('getStudentContacts', () => {
  it('names the foreign key for the linked student, since the table now has two to students', async () => {
    const queries = setup({ data: [], error: null })
    await getStudentContacts('s1')
    const select = callsOf(queries[0], 'select')[0][0] as string
    expect(select).toContain('related_student:students!student_contacts_related_student_id_fkey(')
    expect(callsOf(queries[0], 'eq')).toEqual([['student_id', 's1']])
  })
})

describe('getLinkedStudent', () => {
  it('gives the student, null when there is none, and throws when the read fails', async () => {
    setup({ data: student, error: null })
    expect(await getLinkedStudent('s2')).toEqual(student)
    setup({ data: null, error: null })
    expect(await getLinkedStudent('gone')).toBeNull()
    setup({ data: null, error: { message: 'timeout' } })
    await expect(getLinkedStudent('s2')).rejects.toThrow('timeout')
  })
})
