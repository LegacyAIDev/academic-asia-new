'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

type ActionResult = {
  success: boolean
  error?: string
}

export type CreateIndividualExamInput = {
  student_id: string
  school_id: string
  application_id: string
  exam_type_id: number
  subject?: string | null
  apply_year?: string | null
  delivery_mode_id?: number | null
  preferred_date?: string | null
  preferred_start_time?: string | null
  remarks?: string | null
  confirmed_date?: string | null
  confirmed_start_time?: string | null
  room?: string | null
  seat_no?: number | null
  score?: number | null
  status_id?: number
}

/** Create a new individual exam booking linked to an application */
export async function createIndividualExam(
  input: CreateIndividualExamInput,
  studentId: string
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('student_individual_exams')
      .insert(input as never)

    if (error) {
      console.error('Error creating individual exam:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${studentId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in createIndividualExam:', err)
    return { success: false, error: 'Failed to create exam booking' }
  }
}

/** Update an existing individual exam */
export async function updateIndividualExam(
  examId: string,
  studentId: string,
  input: Partial<Omit<CreateIndividualExamInput, 'student_id' | 'school_id' | 'application_id' | 'exam_type_id'>>
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('student_individual_exams')
      .update(input as never)
      .eq('id', examId)

    if (error) {
      console.error('Error updating individual exam:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${studentId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in updateIndividualExam:', err)
    return { success: false, error: 'Failed to update exam booking' }
  }
}

/** Delete an individual exam */
export async function deleteIndividualExam(
  examId: string,
  studentId: string
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('student_individual_exams')
      .delete()
      .eq('id', examId)

    if (error) {
      console.error('Error deleting individual exam:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${studentId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in deleteIndividualExam:', err)
    return { success: false, error: 'Failed to delete exam booking' }
  }
}
