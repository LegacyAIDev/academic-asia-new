'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

type ActionResult<T = void> = {
  success: boolean
  data?: T
  error?: string
}

export type CreateSchoolVisitInput = {
  school_id: string
  visit_date?: string | null
  school_contact?: string | null
  visit_log?: string | null
  result?: string | null
  remarks?: string | null
}

/** Create a new school visit */
export async function createSchoolVisit(
  input: CreateSchoolVisitInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('school_visits')
      .insert(input as never)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating school visit:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/schools/${input.school_id}`)
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('Error in createSchoolVisit:', err)
    return { success: false, error: 'Failed to create visit' }
  }
}

/** Update an existing school visit */
export async function updateSchoolVisit(
  visitId: string,
  schoolId: string,
  input: Partial<Omit<CreateSchoolVisitInput, 'school_id'>>
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('school_visits')
      .update(input as never)
      .eq('id', visitId)

    if (error) {
      console.error('Error updating school visit:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/schools/${schoolId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in updateSchoolVisit:', err)
    return { success: false, error: 'Failed to update visit' }
  }
}

/** Delete a school visit */
export async function deleteSchoolVisit(
  visitId: string,
  schoolId: string
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('school_visits')
      .delete()
      .eq('id', visitId)

    if (error) {
      console.error('Error deleting school visit:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/schools/${schoolId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in deleteSchoolVisit:', err)
    return { success: false, error: 'Failed to delete visit' }
  }
}
