import { describe, expect, it } from 'vitest'
import { filterStaff, parseStaffFilters, staffFilterOptions } from '../filter-staff'

const person = (first: string, surname: string, level: number | null, department: { id: number; label: string } | null = null) => ({
  first_name: first, surname, email_1: `${first.toLowerCase()}@aa.test`, admin_level: level,
  admin_level_label: level === null ? null : ({ 0: 'Super Admin', 3: 'Manager', 6: 'Staff' } as Record<number, string>)[level], department,
})

const team = [
  person('Ada', 'Admin', 0, { id: 1, label: 'Admin' }),
  person('Maggie', 'Manager', 3),
  person('Sam', 'Staff', 6),
  person('Sue', 'Staff', 6, { id: 2, label: 'Consultant' }),
]

describe('staff filters', () => {
  it('finds a full name, and a name with part of an email', () => {
    expect(filterStaff(team, parseStaffFilters({ search: 'sam staff' })).map(p => p.first_name)).toEqual(['Sam'])
    expect(filterStaff(team, parseStaffFilters({ search: 'Maggie aa.test' })).map(p => p.first_name)).toEqual(['Maggie'])
  })

  it('filters by access level and department together', () => {
    expect(filterStaff(team, parseStaffFilters({ level: '6' })).map(p => p.first_name)).toEqual(['Sam', 'Sue'])
    expect(filterStaff(team, parseStaffFilters({ level: '6', department: '2' })).map(p => p.first_name)).toEqual(['Sue'])
  })

  it('treats unreadable values as any', () => {
    expect(parseStaffFilters({ level: 'x', department: '' })).toEqual({ search: '', level: null, departmentId: null })
  })

  it('offers only levels and departments someone has, with counts', () => {
    const { levels, departments } = staffFilterOptions(team)
    expect(levels).toEqual([{ id: 0, label: 'Super Admin', count: 1 }, { id: 3, label: 'Manager', count: 1 }, { id: 6, label: 'Staff', count: 2 }])
    expect(departments).toEqual([{ id: 1, label: 'Admin', count: 1 }, { id: 2, label: 'Consultant', count: 1 }])
    expect(staffFilterOptions([person('No', 'Dept', 6)]).departments).toEqual([])
  })
})
