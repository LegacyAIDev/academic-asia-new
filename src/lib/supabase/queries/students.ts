import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import type { StudentStatus, PlacementStatus, Course, Nationality, LeadSource, SchoolType } from '@/types/database.types'

export type StudentsListParams = {
  page?: number
  pageSize?: number
  search?: string
  statusId?: number | null
  placementId?: number | null
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
  entry_year: string | null
  status: StudentStatus | null
  placement: PlacementStatus | null
  course: Course | null
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
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = params

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const offset = (page - 1) * pageSize

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
      status:student_statuses!students_status_id_fkey(id, code, label, color),
      placement:placement_statuses!students_placement_id_fkey(id, code, label, color),
      course:courses!students_course_id_fkey(id, code, label)
    `, { count: 'exact' })

  // Apply search filter
  if (search) {
    query = query.or(`first_name.ilike.%${search}%,surname.ilike.%${search}%,student_code.ilike.%${search}%,email.ilike.%${search}%`)
  }

  // Apply status filter
  if (statusId !== undefined && statusId !== null) {
    query = query.eq('status_id', statusId)
  }

  // Apply placement filter
  if (placementId !== undefined && placementId !== null) {
    query = query.eq('placement_id', placementId)
  }

  // Apply sorting
  const validSortColumns = ['created_at', 'surname', 'first_name', 'student_code', 'entry_year']
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at'
  query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1)

  const { data, error, count } = await query

    console.log(data);
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
  address_line_2: string | null
  chinese_address: string | null
  present_school: string | null
  entry_year: string | null
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
  lead_source: { id: number; code: string; label: string; category: string | null } | null
  school_type: { id: number; code: string; label: string; region: string | null } | null
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
      lead_source:lead_sources!students_lead_source_id_fkey(id, code, label, category),
      school_type:school_types!students_present_school_type_id_fkey(id, code, label, region)
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

  const [statuses, placements, nationalities, courses, leadSources, schoolTypes] = await Promise.all([
    supabase.from('student_statuses').select('*').order('sort_order'),
    supabase.from('placement_statuses').select('*').order('sort_order'),
    supabase.from('nationalities').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('courses').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('lead_sources').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('school_types').select('*').order('sort_order')
  ])

  return {
    statuses: statuses.data ?? [],
    placements: placements.data ?? [],
    nationalities: nationalities.data ?? [],
    courses: courses.data ?? [],
    leadSources: leadSources.data ?? [],
    schoolTypes: schoolTypes.data ?? []
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
