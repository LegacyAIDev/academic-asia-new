import { describe, it, expect } from 'vitest'
import { activeChildHref, navigation } from '../sidebar-navigation'

const children = (name: string) => navigation.find((item) => item.name === name)?.children

describe('activeChildHref', () => {
  it('lists Current Schools under Students', () => {
    expect(children('Students')?.flatMap((g) => g.items.map((i) => i.href))).toContain('/students/present-schools')
  })
  it('lights up only the most specific entry', () => {
    expect(activeChildHref(children('Students'), '/students/present-schools')).toBe('/students/present-schools')
    expect(activeChildHref(children('Students'), '/students/brief-intros/export')).toBe('/students/brief-intros/export')
  })
  it('keeps the overview entry for pages that have no entry of their own', () => {
    expect(activeChildHref(children('Students'), '/students')).toBe('/students')
    expect(activeChildHref(children('Students'), '/students/0b8e2c1a/edit')).toBe('/students')
  })
  it('keeps "All Events" to the overview and the type pages to their type', () => {
    expect(activeChildHref(children('Events'), '/events')).toBe('/events')
    expect(activeChildHref(children('Events'), '/events/interview')).toBe('/events/interview')
    expect(activeChildHref(children('Events'), '/events/interview/0b8e2c1a/edit')).toBe('/events/interview')
  })
  it('does not match a longer word that merely starts the same', () => {
    expect(activeChildHref(children('Students'), '/studentsx')).toBeNull()
    expect(activeChildHref(undefined, '/students')).toBeNull()
  })
})
