'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { deleteAttachmentsForRecord } from '@/lib/supabase/actions/record-attachments'

type ActionResult<T = void> = {
  success: boolean
  data?: T
  error?: string
}

export type CreateBankDetailInput = {
  school_id: string
  account_type_id?: number | null
  currency_id?: number | null
  bank_name?: string | null
  account_number?: string | null
  bank_address?: string | null
  account_holder?: string | null
  swift_code?: string | null
  sort_code?: string | null
  iban_number?: string | null
  billing_name?: string | null
  remarks?: string | null
}

/** Create a new bank detail entry */
export async function createSchoolBankDetail(
  input: CreateBankDetailInput
): Promise<ActionResult<{ id: string }>> {
  const denied = await assertAccess(MODULES.SCHOOLS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('school_bank_details')
      .insert(input as never)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating bank detail:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/schools/${input.school_id}`)
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('Error in createSchoolBankDetail:', err)
    return { success: false, error: 'Failed to create bank detail' }
  }
}

/** Update an existing bank detail */
export async function updateSchoolBankDetail(
  detailId: string,
  schoolId: string,
  input: Partial<Omit<CreateBankDetailInput, 'school_id'>>
): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.SCHOOLS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('school_bank_details')
      .update(input as never)
      .eq('id', detailId)

    if (error) {
      console.error('Error updating bank detail:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/schools/${schoolId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in updateSchoolBankDetail:', err)
    return { success: false, error: 'Failed to update bank detail' }
  }
}

/** Delete a bank detail */
export async function deleteSchoolBankDetail(
  detailId: string,
  schoolId: string
): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.SCHOOLS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Attachments are polymorphic, so no foreign key cascades them. Remove them
    // first: an orphaned storage object is invisible and never cleaned up.
    await deleteAttachmentsForRecord('school_bank_detail', detailId, schoolId)

    const { error } = await supabase
      .from('school_bank_details')
      .delete()
      .eq('id', detailId)

    if (error) {
      console.error('Error deleting bank detail:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/schools/${schoolId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in deleteSchoolBankDetail:', err)
    return { success: false, error: 'Failed to delete bank detail' }
  }
}
