import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type SupInfoCategory = {
  id: number
  code: string
  label: string
}

export type SchoolSupplementaryInfo = {
  id: string
  school_id: string
  legacy_info_type: string | null
  category_id: number | null
  category: SupInfoCategory | null
  info: string | null
  school_year: string | null
  remarks: string | null
  assigned_to: string | null
  created_at: string | null
  updated_at: string | null
  assigned_profile: { id: string; first_name: string | null; surname: string | null } | null
}

export type SchoolSupInfoListParams = {
  schoolId: string
  page?: number
  pageSize?: number
  search?: string
  categoryId?: number | null
  schoolYear?: string | null
}

export type SchoolSupInfoListResult = {
  items: SchoolSupplementaryInfo[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Fetch paginated supplementary info for a school
 */
export async function getSchoolSupplementaryInfo(params: SchoolSupInfoListParams): Promise<SchoolSupInfoListResult> {
  const {
    schoolId,
    page = 1,
    pageSize = 25,
    search = '',
    categoryId,
    schoolYear
  } = params

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('school_supplementary_info')
    .select(`
      id,
      school_id,
      legacy_info_type,
      category_id,
      category:school_sup_info_categories!school_supplementary_info_category_id_fkey(id, code, label),
      info,
      school_year,
      remarks,
      assigned_to,
      created_at,
      updated_at,
      assigned_profile:profiles!school_supplementary_info_assigned_to_fkey(id, first_name, surname)
    `, { count: 'exact' })
    .eq('school_id', schoolId)

  // Apply search filter
  if (search) {
    query = query.or(`legacy_info_type.ilike.%${search}%,info.ilike.%${search}%,school_year.ilike.%${search}%`)
  }

  // Apply category filter
  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  // Apply school year filter
  if (schoolYear) {
    query = query.eq('school_year', schoolYear)
  }

  // Order by year descending, then category
  query = query.order('school_year', { ascending: false, nullsFirst: false })
  query = query.order('category_id', { ascending: true })

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching school supplementary info:', error)
    throw new Error(`Failed to fetch supplementary info: ${error.message}`)
  }

  const totalCount = count ?? 0
  const totalPages = Math.ceil(totalCount / pageSize)

  return {
    items: (data ?? []) as unknown as SchoolSupplementaryInfo[],
    totalCount,
    page,
    pageSize,
    totalPages
  }
}

/**
 * Get a single supplementary info by ID
 */
export async function getSchoolSupInfoById(id: string): Promise<SchoolSupplementaryInfo | null> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('school_supplementary_info')
    .select(`
      id,
      school_id,
      legacy_info_type,
      category_id,
      category:school_sup_info_categories!school_supplementary_info_category_id_fkey(id, code, label),
      info,
      school_year,
      remarks,
      assigned_to,
      created_at,
      updated_at,
      assigned_profile:profiles!school_supplementary_info_assigned_to_fkey(id, first_name, surname)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching supplementary info:', error)
    return null
  }

  return data as unknown as SchoolSupplementaryInfo
}

/**
 * Get all categories for the dropdown
 */
export async function getSupInfoCategories(): Promise<SupInfoCategory[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('school_sup_info_categories')
    .select('*')
    .order('sort_order')

  if (error) {
    console.error('Error fetching sup info categories:', error)
    return []
  }

  return (data ?? []) as SupInfoCategory[]
}

/**
 * Get distinct school years for filtering
 */
export async function getDistinctSchoolYears(schoolId?: string): Promise<string[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  let query = supabase
    .from('school_supplementary_info')
    .select('school_year')

  if (schoolId) {
    query = query.eq('school_id', schoolId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching school years:', error)
    return []
  }

  const uniqueYears = [...new Set((data ?? []).map(d => d.school_year))].filter(Boolean).sort().reverse()
  return uniqueYears as string[]
}

/**
 * Get supplementary info count for a school
 */
export async function getSchoolSupInfoCount(schoolId: string): Promise<number> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { count, error } = await supabase
    .from('school_supplementary_info')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)

  if (error) {
    console.error('Error fetching sup info count:', error)
    return 0
  }

  return count ?? 0
}
