import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type StaffListItem = {
  id: string
  first_name: string | null
  surname: string | null
  email_1: string | null
  email_2?: string | null
  telephone: string | null
  mobile: string | null
  fax?: string | null
  position: string | null
  admin_level: number | null
  department_id?: number | null
  join_date: string | null
  yearly_case_count?: number | null
  weekly_case_count?: number | null
  daily_case_count?: number | null
  remarks?: string | null
  department: { id: number; label: string } | null
  /** Label joined from admin_levels — never derive this from the number in the UI. */
  admin_level_label: string | null
}

/**
 * Flatten the joined access-level label.
 *
 * PostgREST types this embed as an array because profiles.admin_level points at
 * admin_levels.level (a unique column) rather than its primary key, so it cannot
 * infer a to-one relationship. Accept either shape.
 */
function withAdminLevelLabel<T extends Record<string, unknown>>(row: T) {
  const { admin_level_ref, ...rest } = row as T & {
    admin_level_ref?: { label: string } | { label: string }[] | null
  }
  const ref = Array.isArray(admin_level_ref) ? admin_level_ref[0] : admin_level_ref
  return { ...rest, admin_level_label: ref?.label ?? null }
}

export type StaffListParams = {
  search?: string
  departmentId?: number
}

/** Fetch all staff profiles with department info */
export async function getStaffList(params: StaffListParams = {}): Promise<StaffListItem[]> {
  const { search, departmentId } = params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  let query = supabase
    .from('profiles')
    .select(`
      id, first_name, surname, email_1, telephone, mobile,
      position, admin_level, join_date,
      department:departments!profiles_department_id_fkey(id, label),
      admin_level_ref:admin_levels!profiles_admin_level_fkey(label)
    `)
    .order('surname')

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,surname.ilike.%${search}%,email_1.ilike.%${search}%`)
  }

  if (departmentId) {
    query = query.eq('department_id', departmentId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching staff:', error)
    return []
  }

  return (data ?? []).map(withAdminLevelLabel) as unknown as StaffListItem[]
}

/** Fetch a single staff profile by ID */
export async function getStaffById(id: string): Promise<StaffListItem | null> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id, first_name, surname, email_1, email_2, telephone, mobile, fax,
      position, admin_level, join_date, department_id,
      yearly_case_count, weekly_case_count, daily_case_count, remarks,
      department:departments!profiles_department_id_fkey(id, label),
      admin_level_ref:admin_levels!profiles_admin_level_fkey(label)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching staff member:', error)
    return null
  }

  return withAdminLevelLabel(data) as unknown as StaffListItem
}

/**
 * Fetch admin levels for the access-level dropdown.
 *
 * Selects `level`, not `id`. `profiles.admin_level` is a foreign key to
 * `admin_levels.level` and the two columns diverge (id 1..6 vs level 0,3,4,6,7,8),
 * so returning `id` here made the form either fail the FK or silently save a
 * different level than the one picked.
 */
export async function getAdminLevels(): Promise<{ id: number; label: string }[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('admin_levels')
    .select('level, label')
    .order('level')

  if (error) {
    console.error('Error fetching admin levels:', error)
    return []
  }

  return (data ?? []).map(l => ({ id: l.level, label: l.label }))
}

/** Fetch departments for filter dropdown */
export async function getDepartments(): Promise<{ id: number; label: string }[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('departments')
    .select('id, label')
    .order('id')

  if (error) {
    console.error('Error fetching departments:', error)
    return []
  }

  return data ?? []
}
