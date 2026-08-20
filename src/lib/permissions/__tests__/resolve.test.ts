import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ACCESS } from '../modules'

const rpc = vi.hoisted(() => vi.fn())
const getUser = vi.hoisted(() => vi.fn())

vi.mock('next/headers', () => ({ cookies: async () => ({}) }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ auth: { getUser }, rpc }),
}))

/**
 * getPermissions is wrapped in React cache(), which memoises per module instance.
 * Re-import per test so each case starts cold.
 */
async function freshGetPermissions() {
  vi.resetModules()
  return (await import('../resolve')).getPermissions
}

beforeEach(() => {
  rpc.mockReset()
  getUser.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('getPermissions', () => {
  it('maps resolver rows onto the permission map', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    rpc.mockResolvedValue({
      data: [
        { module_key: 'students', access: 2 },
        { module_key: 'schools', access: 1 },
      ],
      error: null,
    })

    const permissions = await (await freshGetPermissions())()
    expect(permissions.students).toBe(ACCESS.WRITE)
    expect(permissions.schools).toBe(ACCESS.READ)
  })

  it('closes modules the resolver did not return', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    rpc.mockResolvedValue({ data: [{ module_key: 'students', access: 2 }], error: null })

    const permissions = await (await freshGetPermissions())()
    expect(permissions.staff).toBe(ACCESS.NONE)
    expect(permissions.settings).toBe(ACCESS.NONE)
  })

  it('denies everything when signed out, without calling the resolver', async () => {
    getUser.mockResolvedValue({ data: { user: null } })

    const permissions = await (await freshGetPermissions())()
    expect(Object.values(permissions).every(v => v === ACCESS.NONE)).toBe(true)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('fails closed on a resolver error', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })

    const permissions = await (await freshGetPermissions())()
    expect(Object.values(permissions).every(v => v === ACCESS.NONE)).toBe(true)
  })

  it('fails closed when the client throws', async () => {
    getUser.mockRejectedValue(new Error('network down'))

    const permissions = await (await freshGetPermissions())()
    expect(Object.values(permissions).every(v => v === ACCESS.NONE)).toBe(true)
  })

  it('re-throws framework control flow instead of failing closed', async () => {
    // Next signals dynamic rendering and redirects by throwing. Swallowing those
    // into a denyAll() would break rendering and hide the reason.
    for (const digest of ['DYNAMIC_SERVER_USAGE', 'NEXT_REDIRECT;replace;/login', 'NEXT_NOT_FOUND']) {
      const err = Object.assign(new Error('control flow'), { digest })
      getUser.mockRejectedValue(err)
      await expect((await freshGetPermissions())()).rejects.toThrow('control flow')
    }
  })

  it('ignores unknown module keys from the database', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    rpc.mockResolvedValue({
      data: [{ module_key: 'not_a_module', access: 2 }, { module_key: 'exams', access: 1 }],
      error: null,
    })

    const permissions = await (await freshGetPermissions())()
    expect(permissions).not.toHaveProperty('not_a_module')
    expect(permissions.exams).toBe(ACCESS.READ)
  })

  it('clamps out-of-range access values to NONE', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    rpc.mockResolvedValue({ data: [{ module_key: 'students', access: 9 }], error: null })

    const permissions = await (await freshGetPermissions())()
    expect(permissions.students).toBe(ACCESS.NONE)
  })
})
