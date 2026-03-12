import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type BankAccountType = { id: number; code: string; label: string }
export type Currency = { id: number; code: string; label: string; symbol: string | null }

export type SchoolBankDetailWithJoins = {
  id: string
  school_id: string
  account_type_id: number | null
  currency_id: number | null
  bank_name: string | null
  account_number: string | null
  bank_address: string | null
  account_holder: string | null
  swift_code: string | null
  sort_code: string | null
  iban_number: string | null
  billing_name: string | null
  remarks: string | null
  created_at: string | null
  updated_at: string | null
  account_type: BankAccountType | null
  currency: Currency | null
}

/** Fetch all bank details for a school */
export async function getSchoolBankDetails(schoolId: string): Promise<SchoolBankDetailWithJoins[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('school_bank_details')
    .select(`
      id, school_id, account_type_id, currency_id,
      bank_name, account_number, bank_address, account_holder,
      swift_code, sort_code, iban_number, billing_name, remarks,
      created_at, updated_at,
      account_type:bank_account_types!school_bank_details_account_type_id_fkey(id, code, label),
      currency:currencies!school_bank_details_currency_id_fkey(id, code, label, symbol)
    `)
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching school bank details:', error)
    return []
  }

  return (data ?? []) as unknown as SchoolBankDetailWithJoins[]
}

/** Fetch reference data for dropdowns */
export async function getBankReferenceData() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const [accountTypes, currencies] = await Promise.all([
    supabase.from('bank_account_types').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('currencies').select('*').eq('is_active', true).order('sort_order'),
  ])

  return {
    accountTypes: (accountTypes.data ?? []) as BankAccountType[],
    currencies: (currencies.data ?? []) as Currency[],
  }
}

/** Count bank details for a school */
export async function getSchoolBankDetailCount(schoolId: string): Promise<number> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { count, error } = await supabase
    .from('school_bank_details')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)

  if (error) {
    console.error('Error fetching bank detail count:', error)
    return 0
  }

  return count ?? 0
}
