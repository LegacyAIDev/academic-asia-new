'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

type ActionResult<T = void> = {
  success: boolean
  data?: T
  error?: string
}

export type CreateEventAppInput = {
  student_id: string
  event_id?: string | null
  status_id?: number | null
  email_sent?: boolean | null
  remarks?: string | null
}

/**
 * Create a new event application for a student
 */
export async function createStudentEventApplication(
  input: CreateEventAppInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('student_event_applications')
      .insert(input as never)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating event application:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${input.student_id}`)
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('Error in createStudentEventApplication:', err)
    return { success: false, error: 'Failed to create event application' }
  }
}

/**
 * Update an existing event application
 */
export async function updateStudentEventApplication(
  applicationId: string,
  studentId: string,
  input: Partial<Omit<CreateEventAppInput, 'student_id'>>
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('student_event_applications')
      .update(input as never)
      .eq('id', applicationId)

    if (error) {
      console.error('Error updating event application:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${studentId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in updateStudentEventApplication:', err)
    return { success: false, error: 'Failed to update event application' }
  }
}

/**
 * Delete an event application
 */
export async function deleteStudentEventApplication(
  applicationId: string,
  studentId: string
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('student_event_applications')
      .delete()
      .eq('id', applicationId)

    if (error) {
      console.error('Error deleting event application:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${studentId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in deleteStudentEventApplication:', err)
    return { success: false, error: 'Failed to delete event application' }
  }
}
