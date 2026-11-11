/** The staff list's filters, applied on the server to the whole (small) team. */

type FilterableStaff = {
  first_name: string | null
  surname: string | null
  email_1: string | null
  admin_level: number | null
  admin_level_label: string | null
  department: { id: number; label: string } | null
}

export type StaffFilterParams = { search: string; level: number | null; departmentId: number | null }

export type StaffFilterOption = { id: number; label: string; count: number }

/** Reads ?search=, ?level= and ?department= leniently; anything unreadable means "any". */
export function parseStaffFilters(raw: { search?: string; level?: string; department?: string }): StaffFilterParams {
  const int = (value?: string) => (value && /^\d+$/.test(value) ? Number(value) : null)
  return { search: (raw.search ?? '').trim().slice(0, 100), level: int(raw.level), departmentId: int(raw.department) }
}

/**
 * Every word typed must appear in the name or email, so "sam staff" finds Sam
 * Staff and "sam aa.test" finds them by email.
 */
export function matchesSearch(person: FilterableStaff, search: string): boolean {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const haystack = [person.first_name, person.surname, person.email_1].filter(Boolean).join(' ').toLowerCase()
  return words.every(word => haystack.includes(word))
}

export function filterStaff<T extends FilterableStaff>(staff: T[], params: StaffFilterParams): T[] {
  return staff.filter(person =>
    matchesSearch(person, params.search) &&
    (params.level === null || person.admin_level === params.level) &&
    (params.departmentId === null || person.department?.id === params.departmentId),
  )
}

/** Access levels and departments that someone actually has, with how many people have each. */
export function staffFilterOptions(staff: FilterableStaff[]): { levels: StaffFilterOption[]; departments: StaffFilterOption[] } {
  const levels = new Map<number, StaffFilterOption>()
  const departments = new Map<number, StaffFilterOption>()
  for (const person of staff) {
    if (person.admin_level !== null) {
      const level = levels.get(person.admin_level) ?? { id: person.admin_level, label: person.admin_level_label ?? `Level ${person.admin_level}`, count: 0 }
      level.count++
      levels.set(person.admin_level, level)
    }
    if (person.department) {
      const department = departments.get(person.department.id) ?? { ...person.department, count: 0 }
      department.count++
      departments.set(person.department.id, department)
    }
  }
  return {
    levels: [...levels.values()].sort((a, b) => a.id - b.id),
    departments: [...departments.values()].sort((a, b) => a.label.localeCompare(b.label)),
  }
}
