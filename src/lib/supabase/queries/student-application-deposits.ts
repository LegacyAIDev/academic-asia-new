import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type DepositRecord = {
  id: string
  application_id: string
  deposit_date: string | null
  amount: number | null
  discount: number | null
  has_commission: boolean | null
  remarks: string | null
  assigned_to: string | null
  created_at: string | null
}

/** Fetch all deposits for a given application */
export async function getApplicationDeposits(applicationId: string): Promise<DepositRecord[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('student_application_deposits')
    .select('id, application_id, deposit_date, amount, discount, has_commission, remarks, assigned_to, created_at')
    .eq('application_id', applicationId)
    .order('deposit_date', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('Error fetching deposits:', error)
    return []
  }

  return (data ?? []) as DepositRecord[]
}
