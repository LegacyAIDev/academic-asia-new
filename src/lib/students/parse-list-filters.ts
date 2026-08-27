/**
 * Translate the students list URL parameters into query filters.
 *
 * Shared because more than one screen lists students under the same filters —
 * the list itself and the brief introduction export picker. Kept in one place so
 * a filter added to the panel cannot work on one screen and be silently ignored
 * on the other.
 */

export type StudentListSearchParams = {
  page?: string
  search?: string
  status?: string
  placement?: string
  assigned?: string
  gender?: string
  dob_from?: string
  dob_to?: string
  entry_from?: string
  entry_to?: string
  course?: string
  school?: string
  event?: string
  has_email?: string
  has_phone?: string
}

export interface StudentListFilters {
  search: string
  statusId?: number
  placementId?: number
  assignedTo?: string
  gender?: string
  dobFrom?: string
  dobTo?: string
  entryYearFrom?: number
  entryYearTo?: number
  courseId?: number
  schoolId?: string
  eventId?: string
  hasEmail?: boolean
  hasTelephone?: boolean
}

/** Undefined rather than NaN for a non-numeric parameter, so the filter is skipped. */
function toNumber(value: string | undefined): number | undefined {
  if (!value) return undefined
  const parsed = parseInt(value, 10)
  return Number.isNaN(parsed) ? undefined : parsed
}

/** "yes"/"no" presence filters. Anything else means "do not filter". */
function toPresence(value: string | undefined): boolean | undefined {
  if (value === 'yes') return true
  if (value === 'no') return false
  return undefined
}

export function parseStudentListFilters(params: StudentListSearchParams): StudentListFilters {
  return {
    search: params.search ?? '',
    statusId: toNumber(params.status),
    placementId: toNumber(params.placement),
    assignedTo: params.assigned || undefined,
    gender: params.gender || undefined,
    dobFrom: params.dob_from || undefined,
    dobTo: params.dob_to || undefined,
    entryYearFrom: toNumber(params.entry_from),
    entryYearTo: toNumber(params.entry_to),
    courseId: toNumber(params.course),
    schoolId: params.school || undefined,
    eventId: params.event || undefined,
    hasEmail: toPresence(params.has_email),
    hasTelephone: toPresence(params.has_phone),
  }
}
