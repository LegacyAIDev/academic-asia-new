import { describe, it, expect } from 'vitest'
import { moduleForPath } from '../route-map'
import { MODULES } from '../modules'

describe('moduleForPath', () => {
  it('maps list routes to their module', () => {
    expect(moduleForPath('/students')).toBe(MODULES.STUDENTS)
    expect(moduleForPath('/schools')).toBe(MODULES.SCHOOLS)
    expect(moduleForPath('/events')).toBe(MODULES.EVENTS)
    expect(moduleForPath('/exams')).toBe(MODULES.EXAMS)
    expect(moduleForPath('/staff')).toBe(MODULES.STAFF)
    expect(moduleForPath('/reports')).toBe(MODULES.REPORTS)
    expect(moduleForPath('/settings')).toBe(MODULES.SETTINGS)
  })

  it('maps nested routes to the owning module', () => {
    expect(moduleForPath('/students/123/edit')).toBe(MODULES.STUDENTS)
    expect(moduleForPath('/events/expo-fair/12/scheduler')).toBe(MODULES.EVENTS)
    expect(moduleForPath('/settings/access-levels')).toBe(MODULES.SETTINGS)
    expect(moduleForPath('/schools/export')).toBe(MODULES.SCHOOLS)
  })

  it('treats the root as the dashboard', () => {
    expect(moduleForPath('/')).toBe(MODULES.DASHBOARD)
  })

  it('falls back to dashboard rather than a permissive default', () => {
    // Dashboard is READ for every seeded level, so an unknown route degrades to
    // the least privileged module rather than silently matching something open.
    expect(moduleForPath('/something-new')).toBe(MODULES.DASHBOARD)
  })

  it('does not let a prefix match a longer sibling segment', () => {
    // '/staffing' must not resolve to the staff module
    expect(moduleForPath('/staffing')).toBe(MODULES.DASHBOARD)
  })
})
