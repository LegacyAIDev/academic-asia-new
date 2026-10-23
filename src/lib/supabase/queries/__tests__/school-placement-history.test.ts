import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const state = vi.hoisted(() => ({ client: null as unknown }))

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({})) }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => state.client) }))

import { getSchoolPlacementHistory } from '../school-placement-history'

function setup(result: { data: unknown; error: unknown }) {
  const rpc = vi.fn(async () => result)
  state.client = { rpc }
  return rpc
}

let errorLog: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('getSchoolPlacementHistory', () => {
  it('asks the database function for the school and returns its rows as they come', async () => {
    const rows = [
      { academic_year_start: 2026, applications: 24, offers: 16, accepted: 12, placed: 10 },
      { academic_year_start: null, applications: 4, offers: 0, accepted: 0, placed: 0 },
    ]
    const rpc = setup({ data: rows, error: null })
    await expect(getSchoolPlacementHistory('school-1')).resolves.toEqual(rows)
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('school_placement_history', { p_school_id: 'school-1' })
    expect(errorLog).not.toHaveBeenCalled()
  })

  it('returns an empty list when the function returns nothing', async () => {
    setup({ data: null, error: null })
    await expect(getSchoolPlacementHistory('school-1')).resolves.toEqual([])
  })

  it('returns null and logs when the lookup fails, so a failure is not shown as a school without applications', async () => {
    setup({ data: null, error: { message: 'permission denied' } })
    await expect(getSchoolPlacementHistory('school-1')).resolves.toBeNull()
    expect(errorLog).toHaveBeenCalledTimes(1)
  })
})
