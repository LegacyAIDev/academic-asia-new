import { describe, it, expect } from 'vitest'
import { setManyIn, toggleIn, type SelectedSchool } from '../use-school-selection'

const school = (id: string): SelectedSchool => ({ id, name: `School ${id}` })

describe('toggleIn', () => {
  it('adds a school that is not selected', () => {
    expect(toggleIn([], school('a'))).toEqual([school('a')])
  })

  it('removes a school that is already selected', () => {
    expect(toggleIn([school('a'), school('b')], school('a'))).toEqual([school('b')])
  })

  it('keeps selection order stable when adding', () => {
    const next = toggleIn([school('a')], school('b'))
    expect(next.map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('does not mutate the input', () => {
    const current = [school('a')]
    toggleIn(current, school('b'))
    expect(current).toHaveLength(1)
  })
})

describe('setManyIn', () => {
  const page = [school('a'), school('b')]

  it('selects a whole page at once', () => {
    expect(setManyIn([], page, true).map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('clears a whole page at once', () => {
    expect(setManyIn(page, page, false)).toEqual([])
  })

  it('leaves selections from other pages untouched when selecting', () => {
    const fromAnotherPage = [school('z')]
    const next = setManyIn(fromAnotherPage, page, true)
    expect(next.map((s) => s.id)).toEqual(['z', 'a', 'b'])
  })

  it('leaves selections from other pages untouched when clearing', () => {
    const current = [school('z'), ...page]
    expect(setManyIn(current, page, false).map((s) => s.id)).toEqual(['z'])
  })

  it('does not duplicate schools already selected on this page', () => {
    const current = [school('a')]
    expect(setManyIn(current, page, true).map((s) => s.id)).toEqual(['a', 'b'])
  })
})
