import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type SchoolFeeWithJoins = {
  id: string
  school_id: string
  financial_year: string | null
  fee_type_id: number | null
  description: string | null
  amount: string | null
  payable_to: string | null
  year_levels: string | null
  remarks: string | null
  created_at: string | null
  updated_at: string | null
  fee_type: { id: number; code: string; label: string } | null
}

/**
 * Fetch all fees for a school with joined fee type
 */
export async function getSchoolFees(schoolId: string): Promise<SchoolFeeWithJoins[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('school_fees')
    .select(`
      id, school_id, financial_year, fee_type_id, description,
      amount, payable_to, year_levels, remarks,
      created_at, updated_at,
      fee_type:fee_types!school_fees_fee_type_id_fkey(id, code, label)
    `)
    .eq('school_id', schoolId)
    .order('financial_year', { ascending: false, nullsFirst: false })
    .order('description', { ascending: true })

  if (error) {
    console.error('Error fetching school fees:', error)
    return []
  }

  return (data ?? []) as unknown as SchoolFeeWithJoins[]
}

/**
 * Fetch fee type dropdown values
 */
export async function getFeeReferenceData() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data } = await supabase
    .from('fee_types')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  return { feeTypes: data ?? [] }
}

/**
 * Count fees for a school (for tab badge)
 */
export async function getSchoolFeeCount(schoolId: string): Promise<number> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { count, error } = await supabase
    .from('school_fees')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)

  if (error) {
    console.error('Error fetching fee count:', error)
    return 0
  }

  return count ?? 0
}
