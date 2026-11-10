import { describe, expect, it } from 'vitest'
import { pageSizeFrom, pageWindow, studentsListHref } from '../list-url'

describe('studentsListHref', () => {
  it('keeps filters and goes back to page 1 when anything else changes', () => {
    expect(studentsListHref({ search: 'chan', page: '3', status: '2' }, { status: '3' })).toBe('/students?search=chan&status=3')
  })
  it('changes only the page when paging', () => {
    expect(studentsListHref({ search: 'chan' }, { page: '4' })).toBe('/students?search=chan&page=4')
    expect(studentsListHref({ search: 'chan', page: '4' }, { page: '1' })).toBe('/students?search=chan')
  })
  it('drops a cleared parameter', () => {
    expect(studentsListHref({ status: '2' }, { status: null })).toBe('/students')
  })
})

describe('pageSizeFrom', () => {
  it('accepts only the offered sizes', () => {
    expect(pageSizeFrom('50')).toBe(50)
    expect(pageSizeFrom('5000')).toBe(25)
    expect(pageSizeFrom(undefined)).toBe(25)
  })
})

describe('pageWindow', () => {
  it('lists every page when there are few', () => {
    expect(pageWindow(2, 5)).toEqual([1, 2, 3, 4, 5])
  })
  it('keeps seven slots around the current page', () => {
    expect(pageWindow(1, 40)).toEqual([1, 2, 3, 4, 5, 6, null, 40])
    expect(pageWindow(20, 40)).toEqual([1, null, 18, 19, 20, 21, 22, null, 40])
    expect(pageWindow(40, 40)).toEqual([1, null, 35, 36, 37, 38, 39, 40])
  })
})
