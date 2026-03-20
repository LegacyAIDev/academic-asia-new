'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

type ActionResult = {
  success: boolean
  error?: string
}

export type CreateDepositInput = {
  application_id: string
  deposit_date?: string | null
  amount?: number | null
  discount?: number | null
  has_commission?: boolean
  remarks?: string | null
}

/** Create a new deposit for a student application */
export async function createApplicationDeposit(
  input: CreateDepositInput,
  studentId: string
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('student_application_deposits')
      .insert(input as never)

    if (error) {
      console.error('Error creating deposit:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${studentId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in createApplicationDeposit:', err)
    return { success: false, error: 'Failed to create deposit' }
  }
}

/** Update an existing deposit */
export async function updateApplicationDeposit(
  depositId: string,
  studentId: string,
  input: Partial<Omit<CreateDepositInput, 'application_id'>>
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('student_application_deposits')
      .update(input as never)
      .eq('id', depositId)

    if (error) {
      console.error('Error updating deposit:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${studentId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in updateApplicationDeposit:', err)
    return { success: false, error: 'Failed to update deposit' }
  }
}

/** Delete a deposit */
export async function deleteApplicationDeposit(
  depositId: string,
  studentId: string
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('student_application_deposits')
      .delete()
      .eq('id', depositId)

    if (error) {
      console.error('Error deleting deposit:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${studentId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in deleteApplicationDeposit:', err)
    return { success: false, error: 'Failed to delete deposit' }
  }
}
