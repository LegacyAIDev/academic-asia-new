import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import type { StudentStatus, PlacementStatus, Course, Nationality, LeadSource, SchoolType } from '@/types/database.types'

type SupabaseServerClient = ReturnType<typeof createClient>

// Sentinel: a related-table filter is active but no student matches it.
const NO_MATCHES = Symbol('no-matches')

/**
 * Resolve student IDs matching the related-table filters ("school applied" via
 * student_applications, "event" via student_event_applications). Students must
 * satisfy every active related filter, so the sets are intersected.
 *
 * Returns null when no related filter is active (don't constrain by id),
 * NO_MATCHES when a filter is active but nothing matches, otherwise the id list.
 */
async function resolveRelatedStudentIds(
  supabase: SupabaseServerClient,
  { schoolId, eventId }: { schoolId?: string | null; eventId?: string | null },
): Promise<string[] | null | typeof NO_MATCHES> {
  const idSets: string[][] = []

  if (schoolId) {
    const { data } = await supabase
      .from('student_applications')
      .select('student_id')
      .eq('school_id', schoolId)
    idSets.push((data ?? []).map((r) => r.student_id).filter(Boolean) as string[])
  }

  if (eventId) {
    const { data } = await supabase
      .from('student_event_applications')
      .select('student_id')
      .eq('event_id', eventId)
    idSets.push((data ?? []).map((r) => r.student_id).filter(Boolean) as string[])
  }

  if (idSets.length === 0) return null

  let intersection = idSets[0]
  for (let i = 1; i < idSets.length; i++) {
    const next = new Set(idSets[i])
    intersection = intersection.filter((id) => next.has(id))
  }

  const unique = Array.from(new Set(intersection))
  return unique.length === 0 ? NO_MATCHES : unique
}

export type StudentsListParams = {
  page?: number
  pageSize?: number
  search?: string
  statusId?: number | null
  placementId?: number | null
  assignedTo?: string | null
  gender?: string | null
  dobFrom?: string | null
  dobTo?: string | null
  entryYearFrom?: number | null
  entryYearTo?: number | null
  courseId?: number | null
  schoolId?: string | null
  eventId?: string | null
  hasEmail?: boolean | null
  hasTelephone?: boolean | null
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export type StudentListItem = {
  id: string
  student_code: string | null
  first_name: string
  surname: string
  chinese_name: string | null
  gender: string | null
  email: string | null
  mobile: string | null
  present_school: string | null
  entry_year: number | null
  entry_month: number | null
  status: StudentStatus | null
  placement: PlacementStatus | null
  course: Course | null
  assigned_profile: { id: string; first_name: string | null; surname: string | null } | null
}

export type StudentsListResult = {
  students: StudentListItem[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Fetch paginated students list with search, filters, and sorting
 */
export async function getStudentsList(params: StudentsListParams = {}): Promise<StudentsListResult> {
  const {
    page = 1,
    pageSize = 50,
    search = '',

    statusId,
    placementId,
    assignedTo,
    gender,
    dobFrom,
    dobTo,
    entryYearFrom,
    entryYearTo,
    courseId,
    schoolId,
    eventId,
    hasEmail,
    hasTelephone,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = params

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const offset = (page - 1) * pageSize

  // "School applied" and "Event" filters live in related tables, so resolve the
  // matching student IDs first and constrain the main query with them. A null
  // result means the filter is active but nobody matches → return empty early.
  const relatedStudentIds = await resolveRelatedStudentIds(supabase, { schoolId, eventId })
  if (relatedStudentIds === NO_MATCHES) {
    return { students: [], totalCount: 0, page, pageSize, totalPages: 0 }
  }

  // Build the query with JOINs for reference data
  let query = supabase
    .from('students')
    .select(`
      id,
      student_code,
      first_name,
      surname,
      chinese_name,
      gender,
      email,
      mobile,
      present_school,
      entry_year,
      entry_month,
      status:student_statuses!students_status_id_fkey(id, code, label, color),
      placement:placement_statuses!students_placement_id_fkey(id, code, label, color),
      course:courses!students_course_id_fkey(id, code, label),
      assigned_profile:profiles!students_assigned_to_fkey(id, first_name, surname)
    `, { count: 'exact' })

  // Apply search filter — each whitespace-separated token must match at least one
  // searchable field, so multi-word and cross-field queries work (e.g. "Lily LUEN"
  // where first_name is "Yat Bun Lily" and surname is "LUEN"). Tokens are AND-ed
  // together via chained .or() calls; fields within a token are OR-ed.
  const searchTerm = search.trim()
  if (searchTerm) {
    const searchableColumns = ['first_name', 'surname', 'chinese_name', 'student_code', 'email']
    const tokens = searchTerm
      .split(/\s+/)
      .slice(0, 6)
      // Strip characters that would break PostgREST's or() filter grammar
      .map((token) => token.replace(/[%,()"\\]/g, ''))
      .filter(Boolean)

    for (const token of tokens) {
      query = query.or(searchableColumns.map((column) => `${column}.ilike.%${token}%`).join(','))
    }
  }

  // Apply status filter
  if (statusId !== undefined && statusId !== null) {
    query = query.eq('status_id', statusId)
  }

  // Apply placement filter
  if (placementId !== undefined && placementId !== null) {
    query = query.eq('placement_id', placementId)
  }

  // Apply consultant-in-charge (CIC) filter
  if (assignedTo) {
    query = query.eq('assigned_to', assignedTo)
  }

  // Apply gender filter
  if (gender) {
    query = query.eq('gender', gender)
  }

  // Apply date-of-birth range filter
  if (dobFrom) query = query.gte('date_of_birth', dobFrom)
  if (dobTo) query = query.lte('date_of_birth', dobTo)

  // Apply entry year (course start date) range filter
  if (entryYearFrom !== undefined && entryYearFrom !== null) {
    query = query.gte('entry_year', entryYearFrom)
  }
  if (entryYearTo !== undefined && entryYearTo !== null) {
    query = query.lte('entry_year', entryYearTo)
  }

  // Apply course filter
  if (courseId !== undefined && courseId !== null) {
    query = query.eq('course_id', courseId)
  }

  // Apply has-email / has-telephone presence filters (value present vs empty/null)
  if (hasEmail === true) query = query.not('email', 'is', null).neq('email', '')
  if (hasEmail === false) query = query.or('email.is.null,email.eq.')
  if (hasTelephone === true) query = query.not('telephone', 'is', null).neq('telephone', '')
  if (hasTelephone === false) query = query.or('telephone.is.null,telephone.eq.')

  // Constrain by related-table matches (school applied / event) resolved above
  if (relatedStudentIds !== null) {
    query = query.in('id', relatedStudentIds)
  }

  // Apply sorting
  const validSortColumns = ['created_at', 'surname', 'first_name', 'student_code', 'entry_year']
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at'
  query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching students:', error)
    throw new Error(`Failed to fetch students: ${error.message}`)
  }

  const totalCount = count ?? 0
  const totalPages = Math.ceil(totalCount / pageSize)

  return {
    students: (data ?? []) as unknown as StudentListItem[],
    totalCount,
    page,
    pageSize,
    totalPages
  }
}

// Type for student with joined reference data
export type StudentWithJoins = {
  id: string
  student_code: string | null
  first_name: string
  surname: string
  chinese_name: string | null
  gender: string | null
  date_of_birth: string | null
  email: string | null
  mobile: string | null
  telephone: string | null
  address_line_1: string | null
  chinese_address: string | null
  present_school: string | null
  entry_year: number | null
  entry_month: number | null
  enrollment_date: string | null
  passport_type: string | null
  passport_number: string | null
  exam_paper: string | null
  remarks: string | null
  aa_news: boolean | null
  airport_pickup: boolean | null
  created_at: string | null
  updated_at: string | null
  status: { id: number; code: string; label: string; color: string | null } | null
  placement: { id: number; code: string; label: string; color: string | null } | null
  nationality: { id: number; code: string; label: string } | null
  course: { id: number; code: string; label: string; category: string | null } | null
  lead_source_category: string | null
  lead_source_referral_detail: string | null
  lead_source_event_id: string | null
  lead_source_event: { id: string; name: string } | null
  school_type: { id: number; code: string; label: string; region: string | null } | null
  assigned_to: string | null
  assigned_profile: { id: string; first_name: string | null; surname: string | null } | null
}

/**
 * Fetch single student with all related data
 */
export async function getStudentById(id: string): Promise<StudentWithJoins | null> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('students')
    .select(`
      *,
      status:student_statuses!students_status_id_fkey(id, code, label, color),
      placement:placement_statuses!students_placement_id_fkey(id, code, label, color),
      nationality:nationalities!students_nationality_id_fkey(id, code, label),
      course:courses!students_course_id_fkey(id, code, label, category),
      lead_source_event:events!students_lead_source_event_id_fkey(id, name),
      school_type:school_types!students_present_school_type_id_fkey(id, code, label, region),
      assigned_profile:profiles!students_assigned_to_fkey(id, first_name, surname)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching student:', error)
    return null
  }

  return data as unknown as StudentWithJoins
}

/**
 * Fetch student contacts for a specific student
 */
export async function getStudentContacts(studentId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('student_contacts')
    .select(`
      *,
      relationship:contact_relationships!student_contacts_relationship_id_fkey(id, code, label),
      title:contact_titles!student_contacts_title_id_fkey(id, code, label)
    `)
    .eq('student_id', studentId)
    .order('priority', { ascending: true })

  if (error) {
    console.error('Error fetching student contacts:', error)
    return []
  }

  return data ?? []
}

/**
 * Get student stats for dashboard
 */
export async function getStudentStats() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Get counts by status
  const { data: statusCounts, error } = await supabase
    .from('students')
    .select('status_id, student_statuses!students_status_id_fkey(label)')

  if (error) {
    console.error('Error fetching student stats:', error)
    return {
      total: 0,
      byStatus: {}
    }
  }

  // Count total and by status
  const total = statusCounts?.length ?? 0
  const byStatus: Record<string, number> = {}

  type StatusCountRow = { status_id: number | null; student_statuses: { label: string } | null }
  ;(statusCounts as unknown as StatusCountRow[] | null)?.forEach((s) => {
    const label = s.student_statuses?.label ?? 'Unknown'
    byStatus[label] = (byStatus[label] ?? 0) + 1
  })

  return { total, byStatus }
}

/**
 * Fetch all reference data for forms
 */
export async function getReferenceData() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const [statuses, placements, nationalities, courses, schoolTypes, events, profiles] = await Promise.all([
    supabase.from('student_statuses').select('*').order('sort_order'),
    supabase.from('placement_statuses').select('*').order('sort_order'),
    supabase.from('nationalities').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('courses').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('school_types').select('*').order('sort_order'),
    supabase.from('events').select('id, name').gte('start_date', `${new Date().getFullYear() - 1}-01-01`).order('name'),
    supabase.from('profiles').select('id, first_name, surname').order('first_name'),
  ])

  return {
    statuses: statuses.data ?? [],
    placements: placements.data ?? [],
    nationalities: nationalities.data ?? [],
    courses: courses.data ?? [],
    schoolTypes: schoolTypes.data ?? [],
    events: events.data ?? [],
    profiles: (profiles.data ?? []) as { id: string; first_name: string | null; surname: string | null }[],
  }
}

/**
 * Fetch reference data for contact forms (relationships and titles)
 */
export async function getContactReferenceData() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const [relationships, titles] = await Promise.all([
    supabase.from('contact_relationships').select('*').order('sort_order'),
    supabase.from('contact_titles').select('*').order('sort_order')
  ])

  return {
    relationships: relationships.data ?? [],
    titles: titles.data ?? []
  }
}
