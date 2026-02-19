import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type SchoolsListParams = {
  page?: number
  pageSize?: number
  search?: string
  countryId?: number | null
  genderTypeId?: number | null
  phaseId?: number | null
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export type SchoolListItem = {
  id: string
  name: string
  city: string | null
  county: string | null
  postcode: string | null
  telephone: string | null
  email: string | null
  website: string | null
  pupil_count: number | null
  boarder_count: number | null
  status: string | null
  accepts_applications: boolean | null
  country: { id: number; code: string; label: string } | null
  gender_type: { id: number; code: string; label: string } | null
  institution_type: { id: number; code: string; label: string } | null
  phase: { id: number; code: string; label: string } | null
}

export type SchoolsListResult = {
  schools: SchoolListItem[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Fetch paginated schools list with search, filters, and sorting
 */
export async function getSchoolsList(params: SchoolsListParams = {}): Promise<SchoolsListResult> {
  const {
    page = 1,
    pageSize = 50,
    search = '',
    countryId,
    genderTypeId,
    phaseId,
    sortBy = 'name',
    sortOrder = 'asc'
  } = params

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('schools')
    .select(`
      id,
      name,
      city,
      county,
      postcode,
      telephone,
      email,
      website,
      pupil_count,
      boarder_count,
      status,
      accepts_applications,
      country:countries!schools_country_id_fkey(id, code, label),
      gender_type:school_gender_types!schools_gender_type_id_fkey(id, code, label),
      institution_type:school_institution_types!schools_institution_type_id_fkey(id, code, label),
      phase:school_phases!schools_phase_id_fkey(id, code, label)
    `, { count: 'exact' })

  // Apply search filter
  if (search) {
    query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,county.ilike.%${search}%,postcode.ilike.%${search}%`)
  }

  // Apply country filter
  if (countryId !== undefined && countryId !== null) {
    query = query.eq('country_id', countryId)
  }

  // Apply gender type filter
  if (genderTypeId !== undefined && genderTypeId !== null) {
    query = query.eq('gender_type_id', genderTypeId)
  }

  // Apply phase filter
  if (phaseId !== undefined && phaseId !== null) {
    query = query.eq('phase_id', phaseId)
  }

  // Apply sorting
  const validSortColumns = ['name', 'city', 'county', 'pupil_count', 'created_at']
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'name'
  query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching schools:', error)
    throw new Error(`Failed to fetch schools: ${error.message}`)
  }

  const totalCount = count ?? 0
  const totalPages = Math.ceil(totalCount / pageSize)

  return {
    schools: (data ?? []) as unknown as SchoolListItem[],
    totalCount,
    page,
    pageSize,
    totalPages
  }
}

// Type for school with joined reference data
export type SchoolWithJoins = {
  id: string
  legacy_id: number | null
  name: string
  address: string | null
  city: string | null
  county: string | null
  postcode: string | null
  latitude: number | null
  longitude: number | null
  telephone: string | null
  fax: string | null
  email: string | null
  website: string | null
  pupil_count: number | null
  boarder_count: number | null
  boarder_age_range: string | null
  child_visa_age: number | null
  accepts_child_visa: boolean | null
  accepts_general_visa: boolean | null
  status: string | null
  accepts_applications: boolean | null
  keywords: string | null
  remarks: string | null
  created_at: string | null
  updated_at: string | null
  country: { id: number; code: string; label: string } | null
  gender_type: { id: number; code: string; label: string } | null
  institution_type: { id: number; code: string; label: string } | null
  phase: { id: number; code: string; label: string } | null
  religious_affiliation: { id: number; code: string; label: string } | null
}

/**
 * Fetch single school with all related data
 */
export async function getSchoolById(id: string): Promise<SchoolWithJoins | null> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('schools')
    .select(`
      *,
      country:countries!schools_country_id_fkey(id, code, label),
      gender_type:school_gender_types!schools_gender_type_id_fkey(id, code, label),
      institution_type:school_institution_types!schools_institution_type_id_fkey(id, code, label),
      phase:school_phases!schools_phase_id_fkey(id, code, label),
      religious_affiliation:school_religious_affiliations!schools_religious_affiliation_id_fkey(id, code, label)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching school:', error)
    return null
  }

  return data as unknown as SchoolWithJoins
}

/**
 * Get school stats for dashboard
 */
export async function getSchoolStats() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: schools, error } = await supabase
    .from('schools')
    .select('status, accepts_applications, country_id, countries!schools_country_id_fkey(label)')

  if (error) {
    console.error('Error fetching school stats:', error)
    return {
      total: 0,
      accepting: 0,
      byCountry: {}
    }
  }

  const total = schools?.length ?? 0
  const accepting = schools?.filter(s => s.accepts_applications).length ?? 0
  const byCountry: Record<string, number> = {}

  type SchoolRow = { status: string | null; accepts_applications: boolean | null; country_id: number | null; countries: { label: string } | null }
  ;(schools as unknown as SchoolRow[] | null)?.forEach((s) => {
    const label = s.countries?.label ?? 'Unknown'
    byCountry[label] = (byCountry[label] ?? 0) + 1
  })

  return { total, accepting, byCountry }
}

/**
 * Fetch all reference data for school forms
 */
export async function getSchoolReferenceData() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const [countries, genderTypes, institutionTypes, phases, religiousAffiliations] = await Promise.all([
    supabase.from('countries').select('*').order('sort_order'),
    supabase.from('school_gender_types').select('*').order('sort_order'),
    supabase.from('school_institution_types').select('*').order('sort_order'),
    supabase.from('school_phases').select('*').order('sort_order'),
    supabase.from('school_religious_affiliations').select('*').order('sort_order')
  ])

  return {
    countries: countries.data ?? [],
    genderTypes: genderTypes.data ?? [],
    institutionTypes: institutionTypes.data ?? [],
    phases: phases.data ?? [],
    religiousAffiliations: religiousAffiliations.data ?? []
  }
}
