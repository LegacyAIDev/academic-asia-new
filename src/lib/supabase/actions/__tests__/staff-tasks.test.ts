import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callsOf, makeSupabaseStub, used } from '../../queries/__tests__/supabase-stub'

const state = vi.hoisted(() => ({ client: null as unknown, rights: new Set<string>() }))
const DENIED = { success: false, error: 'You do not have permission to perform this action.' }

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({})) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => state.client) }))
vi.mock('@/lib/permissions/guard', () => ({
  assertAccess: vi.fn(async (module: string, level = 1) => (state.rights.has(`${module}:${level}`) ? null : DENIED)),
}))

import { clearCompletedTasks, createTask, deleteTask, setTaskCompleted, updateTask } from '../staff-tasks'

const ME = '11111111-1111-4111-8111-111111111111'
const TASK = '22222222-2222-4222-8222-222222222222'
const row = { id: TASK, title: 'Chase offer', notes: null, priority: 'high', due_date: '2026-11-02', completed_at: null, created_at: 'c' }

function setup(response: { data: unknown; error: unknown } = { data: row, error: null }, rights = ['dashboard:1'], user: string | null = ME) {
  state.rights = new Set(rights)
  const stub = makeSupabaseStub(() => response)
  state.client = Object.assign(stub.supabase, { auth: { getUser: async () => ({ data: { user: user ? { id: user } : null }, error: null }) } })
  return stub
}

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
afterEach(() => vi.restoreAllMocks())

describe('staff tasks', () => {
  it('adds a task for the signed-in user only', async () => {
    const stub = setup()
    const result = await createTask({ title: ' Chase offer ', priority: 'high', dueDate: '2026-11-02' })
    expect(result.data).toMatchObject({ id: TASK, title: 'Chase offer', priority: 'high', dueDate: '2026-11-02' })
    expect(callsOf(stub.queries[0], 'insert')[0][0]).toEqual({ title: 'Chase offer', notes: null, priority: 'high', due_date: '2026-11-02', owner_id: ME })
  })

  it('needs a signed-in staff member with the dashboard, and a valid task', async () => {
    let stub = setup(undefined, [])
    expect(await createTask({ title: 'x' })).toEqual(DENIED)
    expect(stub.queries).toHaveLength(0)
    stub = setup()
    expect((await createTask({ title: '' })).error).toBe('Write the task first')
    expect(stub.queries).toHaveLength(0)
    setup(undefined, ['dashboard:1'], null)
    expect((await createTask({ title: 'x' })).error).toBe('Please sign in again.')
  })

  it('edits, completes and reopens only the owner\'s task', async () => {
    let stub = setup()
    await updateTask(TASK, { title: 'New wording' })
    expect(callsOf(stub.queries[0], 'eq')).toEqual([['id', TASK], ['owner_id', ME]])
    stub = setup()
    await setTaskCompleted(TASK, true)
    expect((callsOf(stub.queries[0], 'update')[0][0] as { completed_at: string }).completed_at).toMatch(/^\d{4}-/)
    stub = setup()
    await setTaskCompleted(TASK, false)
    expect(callsOf(stub.queries[0], 'update')[0][0]).toEqual({ completed_at: null })
  })

  it('reports someone else\'s task, or a bad id, as not found', async () => {
    setup({ data: null, error: null })
    expect(await setTaskCompleted(TASK, true)).toEqual({ success: false, error: 'Task not found' })
    const stub = setup()
    expect(await updateTask('nope', { title: 'x' })).toEqual({ success: false, error: 'Task not found' })
    expect(await deleteTask('nope')).toEqual({ success: false, error: 'Task not found' })
    expect(stub.queries).toHaveLength(0)
  })

  it('deletes one task, or clears every completed task of the owner', async () => {
    let stub = setup({ data: [{ id: TASK }], error: null })
    expect(await deleteTask(TASK)).toEqual({ success: true })
    expect(used(stub.queries[0], 'delete')).toBe(true)
    stub = setup({ data: [{ id: 'a' }, { id: 'b' }], error: null })
    expect(await clearCompletedTasks()).toEqual({ success: true, data: { removed: 2 } })
    expect(callsOf(stub.queries[0], 'eq')).toEqual([['owner_id', ME]])
    expect(callsOf(stub.queries[0], 'not')).toEqual([['completed_at', 'is', null]])
  })
})
