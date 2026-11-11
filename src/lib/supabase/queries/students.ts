import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import type { StudentStatus, PlacementStatus, Course } from '@/types/database.types'
import type { LinkedStudent } from '@/lib/supabase/queries/student-family'

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
  /** Has a brief introduction (true), has none (false), either (undefined). */
  hasBriefIntro?: boolean | null
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
  created_at: string | null
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

type ListFilters = Omit<StudentsListParams, 'page' | 'pageSize' | 'sortBy' | 'sortOrder'>

/**
 * students rows under the list filters. One builder for the rows and for the
 * per-status counts, so a filter can never apply to one and not the other.
 */
function filteredStudents(
  supabase: SupabaseServerClient,
  select: string,
  count: { count: 'exact'; head?: boolean },
  filters: ListFilters,
  relatedStudentIds: string[] | null,
) {
  // Brief introduction written or not: joined in the database (13k+ intros are
  // too many to pass as an id list). Inner join keeps students with one; a
  // left join filtered to null keeps those without.
  const introJoin = filters.hasBriefIntro === true
    ? ', intro_filter:student_brief_intro!student_brief_intro_student_id_fkey!inner(id)'
    : filters.hasBriefIntro === false
      ? ', intro_filter:student_brief_intro!student_brief_intro_student_id_fkey(id)'
      : ''
  let query = supabase.from('students').select(select + introJoin, count)
  if (filters.hasBriefIntro === false) query = query.is('intro_filter' as 'id', null)

  // Search: each whitespace-separated token must match at least one searchable
  // field, so multi-word and cross-field queries work (e.g. "Lily LUEN" where
  // first_name is "Yat Bun Lily" and surname is "LUEN"). Trigram indexes serve
  // these substring matches (migration 20261111022047).
  const searchTerm = (filters.search ?? '').trim()
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

  if (filters.statusId != null) query = query.eq('status_id', filters.statusId)
  if (filters.placementId != null) query = query.eq('placement_id', filters.placementId)
  // Consultant in charge (CIC)
  if (filters.assignedTo) query = query.eq('assigned_to', filters.assignedTo)
  if (filters.gender) query = query.eq('gender', filters.gender)
  if (filters.dobFrom) query = query.gte('date_of_birth', filters.dobFrom)
  if (filters.dobTo) query = query.lte('date_of_birth', filters.dobTo)
  // Entry year (course start date) range
  if (filters.entryYearFrom != null) query = query.gte('entry_year', filters.entryYearFrom)
  if (filters.entryYearTo != null) query = query.lte('entry_year', filters.entryYearTo)
  if (filters.courseId != null) query = query.eq('course_id', filters.courseId)

  // Has-email / has-telephone presence (value present vs empty/null)
  if (filters.hasEmail === true) query = query.not('email', 'is', null).neq('email', '')
  if (filters.hasEmail === false) query = query.or('email.is.null,email.eq.')
  if (filters.hasTelephone === true) query = query.not('telephone', 'is', null).neq('telephone', '')
  if (filters.hasTelephone === false) query = query.or('telephone.is.null,telephone.eq.')

  // Constrain by related-table matches (school applied / event)
  if (relatedStudentIds !== null) query = query.in('id', relatedStudentIds)

  return query
}

/** Sort keys the list offers. Each ends on id, so pages never overlap or skip a student. */
const SORTS: Record<string, { column: string; then?: string }> = {
  created_at: { column: 'created_at' },
  name: { column: 'surname', then: 'first_name' },
  surname: { column: 'surname', then: 'first_name' },
  first_name: { column: 'first_name' },
  student_code: { column: 'student_code' },
  entry_year: { column: 'entry_year' },
}

/**
 * Fetch paginated students list with search, filters, and sorting. A page past
 * the end returns the last page, so a stale link never shows an empty list.
 */
export async function getStudentsList(params: StudentsListParams = {}): Promise<StudentsListResult> {
  const { page: requestedPage = 1, pageSize = 25, sortBy = 'created_at', sortOrder = 'desc', ...filters } = params
  const supabase = createClient(await cookies())

  // "School applied" and "Event" filters live in related tables, so resolve the
  // matching student IDs first and constrain the main query with them.
  const relatedStudentIds = await resolveRelatedStudentIds(supabase, filters)
  if (relatedStudentIds === NO_MATCHES) {
    return { students: [], totalCount: 0, page: 1, pageSize, totalPages: 0 }
  }

  const fetchPage = async (page: number) => {
    const sort = SORTS[sortBy] ?? SORTS.created_at
    const ascending = sortOrder === 'asc'
    let query = filteredStudents(supabase, LIST_SELECT, { count: 'exact' }, filters, relatedStudentIds)
      .order(sort.column, { ascending, nullsFirst: false })
    if (sort.then) query = query.order(sort.then, { ascending })
    const offset = (page - 1) * pageSize
    const { data, error, count } = await query.order('id', { ascending }).range(offset, offset + pageSize - 1)
    // PostgREST answers a range past the end with 416; that is "no rows", not a failure.
    if (error && error.code !== 'PGRST103') {
      console.error('Error fetching students:', error)
      throw new Error(`Failed to fetch students: ${error.message}`)
    }
    return { rows: (data ?? []) as unknown as StudentListItem[], count: count ?? null }
  }

  let page = Math.max(1, Math.floor(requestedPage) || 1)
  let { rows, count } = await fetchPage(page)
  if (count === null) {
    // Past the end: count it, then serve the last page instead.
    const { count: total } = await filteredStudents(supabase, 'id', { count: 'exact', head: true }, filters, relatedStudentIds)
    count = total ?? 0
  }
  const totalPages = Math.ceil(count / pageSize)
  if (page > totalPages && totalPages > 0) {
    page = totalPages
    rows = (await fetchPage(page)).rows
  }

  return { students: rows, totalCount: count, page, pageSize, totalPages }
}

const LIST_SELECT = `
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
  created_at,
  status:student_statuses!students_status_id_fkey(id, code, label, color),
  placement:placement_statuses!students_placement_id_fkey(id, code, label, color),
  course:courses!students_course_id_fkey(id, code, label),
  assigned_profile:profiles!students_assigned_to_fkey(id, first_name, surname)
`

export type StudentStatusCount = { id: number; code: string; label: string; count: number | null }

/**
 * How many students each status holds under every other filter in use, for the
 * status tabs above the list. A count that fails is null and shows no number.
 */
export async function getStudentStatusCounts(params: ListFilters): Promise<{ all: number | null; statuses: StudentStatusCount[] }> {
  const supabase = createClient(await cookies())
  const filters = { ...params, statusId: undefined }
  const [{ data: statuses }, related] = await Promise.all([
    supabase.from('student_statuses').select('id, code, label').order('sort_order'),
    resolveRelatedStudentIds(supabase, filters),
  ])
  const count = async (statusId?: number) => {
    if (related === NO_MATCHES) return 0
    const { count: n, error } = await filteredStudents(supabase, 'id', { count: 'exact', head: true }, { ...filters, statusId }, related)
    if (error) console.error('Student status count failed:', error.message)
    return error ? null : n ?? 0
  }
  const [all, ...perStatus] = await Promise.all([count(), ...(statuses ?? []).map(s => count(s.id))])
  return { all, statuses: (statuses ?? []).map((s, i) => ({ ...s, count: perStatus[i] })) }
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
  present_school_id: number | null
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

/** A family member or other contact of a student, with what the Family tab and its dialog show. */
export type StudentContactWithRelations = {
  id: string
  student_id: string
  first_name: string | null
  surname: string | null
  mobile: string | null
  telephone: string | null
  fax: string | null
  email_1: string | null
  email_2: string | null
  email_3: string | null
  address_1: string | null
  address_2: string | null
  occupation: string | null
  office_telephone: string | null
  office_fax: string | null
  priority: number | null
  gender: string | null
  status: string | null
  remarks: string | null
  relationship_id: number | null
  title_id: number | null
  related_student_id: string | null
  relationship: { id: number; code: string; label: string } | null
  title: { id: number; code: string; label: string } | null
  /** Set when this family member is a student too. */
  related_student: LinkedStudent | null
}

/**
 * Fetch student contacts for a specific student
 */
export async function getStudentContacts(studentId: string): Promise<StudentContactWithRelations[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('student_contacts')
    .select(`
      *,
      relationship:contact_relationships!student_contacts_relationship_id_fkey(id, code, label),
      title:contact_titles!student_contacts_title_id_fkey(id, code, label),
      related_student:students!student_contacts_related_student_id_fkey(id, student_code, first_name, surname, chinese_name, gender, date_of_birth, present_school)
    `)
    .eq('student_id', studentId)
    .order('priority', { ascending: true })

  if (error) {
    console.error('Error fetching student contacts:', error)
    return []
  }

  return (data ?? []) as unknown as StudentContactWithRelations[]
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

/** Choices for the students list dropdowns, loaded with the page so they never pop in. */
export async function getStudentFilterOptions() {
  const supabase = createClient(await cookies())
  const [statuses, placements, consultants] = await Promise.all([
    supabase.from('student_statuses').select('id, code, label').order('sort_order'),
    supabase.from('placement_statuses').select('id, code, label').order('sort_order'),
    supabase.from('profiles').select('id, first_name, surname').order('first_name'),
  ])
  return { statuses: statuses.data ?? [], placements: placements.data ?? [], consultants: consultants.data ?? [] }
}
