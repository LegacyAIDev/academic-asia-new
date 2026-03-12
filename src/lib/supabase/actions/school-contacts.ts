'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

type ActionResult<T = void> = {
  success: boolean
  data?: T
  error?: string
}

export type CreateSchoolContactInput = {
  school_id: string
  position?: string | null
  surname?: string | null
  first_name?: string | null
  title?: string | null
  gender?: string | null
  telephone?: string | null
  mobile?: string | null
  fax?: string | null
  email_1?: string | null
  email_2?: string | null
  email_3?: string | null
  address_1?: string | null
  address_2?: string | null
  priority?: number | null
  responsible?: string | null
  remarks?: string | null
}

/** Create a new school contact */
export async function createSchoolContact(
  input: CreateSchoolContactInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('school_contacts')
      .insert(input as never)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating school contact:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/schools/${input.school_id}`)
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('Error in createSchoolContact:', err)
    return { success: false, error: 'Failed to create contact' }
  }
}

/** Update an existing school contact */
export async function updateSchoolContact(
  contactId: string,
  schoolId: string,
  input: Partial<Omit<CreateSchoolContactInput, 'school_id'>>
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('school_contacts')
      .update(input as never)
      .eq('id', contactId)

    if (error) {
      console.error('Error updating school contact:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/schools/${schoolId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in updateSchoolContact:', err)
    return { success: false, error: 'Failed to update contact' }
  }
}

/** Delete a school contact */
export async function deleteSchoolContact(
  contactId: string,
  schoolId: string
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('school_contacts')
      .delete()
      .eq('id', contactId)

    if (error) {
      console.error('Error deleting school contact:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/schools/${schoolId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in deleteSchoolContact:', err)
    return { success: false, error: 'Failed to delete contact' }
  }
}
