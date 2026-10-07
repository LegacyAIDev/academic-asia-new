'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'

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
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

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
/** Compute status: needs both confirmed date AND time to move to Confirmed, then score for Completed */
function deriveStatus(confirmed_date?: string | null, confirmed_start_time?: string | null, score?: number | null): number {
  if (confirmed_date && confirmed_start_time && score != null) return 3 // Completed
  if (confirmed_date && confirmed_start_time) return 2 // Confirmed
  return 1 // Pending
}

/**
 * Updates the score or remarks of an exam. Date, time, room and seat are owned
 * by the scheduler and can only change through a scheduler booking.
 */
export async function updateExamFields(
  examId: string,
  input: { score?: number | null; remarks?: string | null }
): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  const allowed = ['score', 'remarks']
  if (Object.keys(input).some(key => !allowed.includes(key))) {
    return { success: false, error: 'Scheduling fields are managed by the scheduler.' }
  }

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: current, error: fetchError } = await supabase
      .from('student_individual_exams')
      .select('confirmed_date, confirmed_start_time, score, status_id')
      .eq('id', examId)
      .single()
    if (fetchError) return { success: false, error: fetchError.message }

    const finalScore = input.score !== undefined ? input.score : current?.score
    const status_id = current?.status_id === 4
      ? 4
      : deriveStatus(current?.confirmed_date, current?.confirmed_start_time, finalScore)

    const { error } = await supabase
      .from('student_individual_exams')
      .update({ score: input.score, remarks: input.remarks, status_id } as never)
      .eq('id', examId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/exams')
    revalidatePath('/students')
    revalidatePath('/scheduler')
    return { success: true }
  } catch (err) {
    console.error('Error in updateExamFields:', err)
    return { success: false, error: 'Failed to update exam' }
  }
}

/** Delete an individual exam */
export async function deleteIndividualExam(
  examId: string,
  studentId: string
): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

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
