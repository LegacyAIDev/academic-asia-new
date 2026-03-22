'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

type ActionResult = { success: boolean; error?: string }

export type CreateAATestInput = {
  student_id: string
  exam_type_id: number
  subject?: string | null
  apply_year?: string | null
  preferred_date?: string | null
  preferred_start_time?: string | null
  remarks?: string | null
  status_id?: number
}

/** Book an AA test from the resume section (no application context needed) */
export async function createAATestBooking(input: CreateAATestInput): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('student_individual_exams')
      .insert(input as never)

    if (error) {
      console.error('Error creating AA test booking:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${input.student_id}`)
    return { success: true }
  } catch (err) {
    console.error('Error in createAATestBooking:', err)
    return { success: false, error: 'Failed to book AA test' }
  }
}
