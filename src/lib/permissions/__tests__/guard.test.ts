import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ACCESS, MODULES, denyAll, type PermissionMap } from '../modules'

const getPermissions = vi.hoisted(() => vi.fn())
const getUser = vi.hoisted(() => vi.fn())
const selectIn = vi.hoisted(() => vi.fn())

vi.mock('../resolve', () => ({ getPermissions }))
vi.mock('next/headers', () => ({ cookies: async () => ({}) }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser },
    from: () => ({ select: () => ({ in: selectIn }) }),
  }),
}))

const {
  canAccess, assertAccess, assertNoEscalation, assertOutranksTarget, assertCanManageAccess,
} = await import('../guard')

function map(overrides: Partial<PermissionMap> = {}): PermissionMap {
  return { ...denyAll(), ...overrides }
}

beforeEach(() => getPermissions.mockReset())

describe('canAccess', () => {
  it('grants when the held access meets the requirement', async () => {
    getPermissions.mockResolvedValue(map({ students: ACCESS.WRITE }))
    expect(await canAccess(MODULES.STUDENTS, ACCESS.READ)).toBe(true)
    expect(await canAccess(MODULES.STUDENTS, ACCESS.WRITE)).toBe(true)
  })

  it('denies write when only read is held', async () => {
    getPermissions.mockResolvedValue(map({ students: ACCESS.READ }))
    expect(await canAccess(MODULES.STUDENTS, ACCESS.WRITE)).toBe(false)
  })

  it('denies everything on an all-NONE map, including dashboard', async () => {
    getPermissions.mockResolvedValue(denyAll())
    expect(await canAccess(MODULES.DASHBOARD)).toBe(false)
    expect(await canAccess(MODULES.STAFF)).toBe(false)
  })

  it('defaults to READ when no level is given', async () => {
    getPermissions.mockResolvedValue(map({ schools: ACCESS.READ }))
    expect(await canAccess(MODULES.SCHOOLS)).toBe(true)
  })
})

describe('assertAccess', () => {
  it('returns null when allowed', async () => {
    getPermissions.mockResolvedValue(map({ staff: ACCESS.WRITE }))
    expect(await assertAccess(MODULES.STAFF, ACCESS.WRITE)).toBeNull()
  })

  it('returns an ActionResult-shaped error rather than throwing', async () => {
    getPermissions.mockResolvedValue(denyAll())
    const result = await assertAccess(MODULES.STAFF, ACCESS.WRITE)
    expect(result).toEqual({ success: false, error: expect.any(String) })
  })
})

describe('assertNoEscalation', () => {
  const managerPerms = map({ students: ACCESS.WRITE, staff: ACCESS.READ })

  it('lets Super Admin do anything', async () => {
    expect(await assertNoEscalation(0, { adminLevel: 0 })).toBeNull()
  })

  it('rejects a caller with no level set', async () => {
    expect(await assertNoEscalation(null, { adminLevel: 8 })).not.toBeNull()
  })

  it('rejects granting a more powerful level than the caller holds', async () => {
    // Manager (3) trying to mint a Super Admin (0)
    expect(await assertNoEscalation(3, { adminLevel: 0 })).not.toBeNull()
  })

  it('allows granting an equal or weaker level', async () => {
    expect(await assertNoEscalation(3, { adminLevel: 3 })).toBeNull()
    expect(await assertNoEscalation(3, { adminLevel: 8 })).toBeNull()
  })

  it('rejects granting more module access than the caller holds', async () => {
    const denied = await assertNoEscalation(
      3, { access: { staff: ACCESS.WRITE } }, managerPerms,
    )
    expect(denied).not.toBeNull()
    expect(denied?.error).toContain('staff')
  })

  it('allows granting access the caller holds', async () => {
    expect(
      await assertNoEscalation(3, { access: { students: ACCESS.WRITE, staff: ACCESS.READ } }, managerPerms),
    ).toBeNull()
  })

  it('falls back to the caller live permissions when none are passed', async () => {
    getPermissions.mockResolvedValue(managerPerms)
    expect(await assertNoEscalation(3, { access: { staff: ACCESS.WRITE } })).not.toBeNull()
    expect(getPermissions).toHaveBeenCalled()
  })
})

describe('assertOutranksTarget', () => {
  const CALLER = 'caller-id'
  const TARGET = 'target-id'

  function levels(callerLevel: number | null, targetLevel: number | null) {
    getUser.mockResolvedValue({ data: { user: { id: CALLER } } })
    selectIn.mockResolvedValue({
      data: [
        { id: CALLER, admin_level: callerLevel },
        { id: TARGET, admin_level: targetLevel },
      ],
      error: null,
    })
  }

  it('blocks acting on a more senior colleague', async () => {
    // Senior Staff (4) must not be able to touch a Super Admin (0) — this is the
    // path that previously allowed resetting an admin password by omitting
    // admin_level from the payload.
    levels(4, 0)
    expect(await assertOutranksTarget(TARGET)).not.toBeNull()
  })

  it('allows acting on a peer', async () => {
    levels(3, 3)
    expect(await assertOutranksTarget(TARGET)).toBeNull()
  })

  it('allows acting on a more junior colleague', async () => {
    levels(3, 8)
    expect(await assertOutranksTarget(TARGET)).toBeNull()
  })

  it('lets Super Admin act on anyone', async () => {
    levels(0, 0)
    expect(await assertOutranksTarget(TARGET)).toBeNull()
  })

  it('blocks a caller with no level from acting on anyone with one', async () => {
    levels(null, 8)
    expect(await assertOutranksTarget(TARGET)).not.toBeNull()
  })

  it('denies when signed out', async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    expect(await assertOutranksTarget(TARGET)).not.toBeNull()
  })

  it('fails closed when the lookup errors', async () => {
    getUser.mockResolvedValue({ data: { user: { id: CALLER } } })
    selectIn.mockResolvedValue({ data: null, error: { message: 'boom' } })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await assertOutranksTarget(TARGET)).not.toBeNull()
  })
})

describe('assertCanManageAccess', () => {
  it('allows Manager and above', async () => {
    expect(await assertCanManageAccess(0)).toBeNull()
    expect(await assertCanManageAccess(3)).toBeNull()
  })

  it('blocks below Manager, even with staff:WRITE', async () => {
    expect(await assertCanManageAccess(4)).not.toBeNull()
    expect(await assertCanManageAccess(8)).not.toBeNull()
    expect(await assertCanManageAccess(null)).not.toBeNull()
  })
})
