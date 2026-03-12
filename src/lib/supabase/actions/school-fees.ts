'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

type ActionResult<T = void> = {
  success: boolean
  data?: T
  error?: string
}

export type CreateSchoolFeeInput = {
  school_id: string
  financial_year?: string | null
  fee_type_id?: number | null
  description?: string | null
  amount?: number | null
  payable_to?: string | null
  year_levels?: string | null
  remarks?: string | null
}

/**
 * Create a new fee entry for a school
 */
export async function createSchoolFee(
  input: CreateSchoolFeeInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('school_fees')
      .insert(input as never)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating school fee:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/schools/${input.school_id}`)
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('Error in createSchoolFee:', err)
    return { success: false, error: 'Failed to create school fee' }
  }
}

/**
 * Update an existing school fee
 */
export async function updateSchoolFee(
  feeId: string,
  schoolId: string,
  input: Partial<Omit<CreateSchoolFeeInput, 'school_id'>>
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('school_fees')
      .update(input as never)
      .eq('id', feeId)

    if (error) {
      console.error('Error updating school fee:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/schools/${schoolId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in updateSchoolFee:', err)
    return { success: false, error: 'Failed to update school fee' }
  }
}

/**
 * Delete a school fee
 */
export async function deleteSchoolFee(
  feeId: string,
  schoolId: string
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('school_fees')
      .delete()
      .eq('id', feeId)

    if (error) {
      console.error('Error deleting school fee:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/schools/${schoolId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in deleteSchoolFee:', err)
    return { success: false, error: 'Failed to delete school fee' }
  }
}
