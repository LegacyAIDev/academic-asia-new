'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'

type ActionResult<T = void> = {
  success: boolean
  data?: T
  error?: string
}

export type CreateTravelInput = {
  student_id: string
  journey_no?: number | null
  route?: number | null
  requires_pickup?: boolean | null
  status_id?: number | null
  airline_id?: number | null
  flight_number?: string | null
  airport_id?: number | null
  arrival_date?: string | null
  arrival_time?: string | null
  pickup_status_id?: number | null
  pickup_provider_id?: number | null
  pickup_by?: string | null
  meeting_point_details?: string | null
  fee?: number | null
  remarks?: string | null
}

/**
 * Create a new travel record for a student
 */
export async function createStudentTravel(
  input: CreateTravelInput
): Promise<ActionResult<{ id: string }>> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('student_travel')
      .insert(input as never)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating travel:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${input.student_id}`)
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('Error in createStudentTravel:', err)
    return { success: false, error: 'Failed to create travel record' }
  }
}

/**
 * Update an existing travel record
 */
export async function updateStudentTravel(
  travelId: string,
  studentId: string,
  input: Partial<Omit<CreateTravelInput, 'student_id'>>
): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('student_travel')
      .update(input as never)
      .eq('id', travelId)

    if (error) {
      console.error('Error updating travel:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${studentId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in updateStudentTravel:', err)
    return { success: false, error: 'Failed to update travel record' }
  }
}

/**
 * Delete a travel record
 */
export async function deleteStudentTravel(
  travelId: string,
  studentId: string
): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('student_travel')
      .delete()
      .eq('id', travelId)

    if (error) {
      console.error('Error deleting travel:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${studentId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in deleteStudentTravel:', err)
    return { success: false, error: 'Failed to delete travel record' }
  }
}
