'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

type ActionResult<T = void> = {
  success: boolean
  data?: T
  error?: string
}

export type UpsertInternalNotesInput = {
  student_id: string
  character?: string | null
  strategy?: string | null
  parent_expectations?: string | null
  disability_sen?: string | null
  medical_notes?: string | null
  guardianship_notes?: string | null
  additional_remarks?: string | null
}

/** Create or update internal notes for a student (one record per student) */
export async function upsertStudentInternalNotes(
  input: UpsertInternalNotesInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: existing } = await supabase
      .from('student_internal_notes')
      .select('id')
      .eq('student_id', input.student_id)
      .maybeSingle()

    if (existing) {
      const { student_id: _, ...updateFields } = input
      const { error } = await supabase
        .from('student_internal_notes')
        .update(updateFields as never)
        .eq('id', existing.id)

      if (error) {
        console.error('Error updating internal notes:', error)
        return { success: false, error: error.message }
      }

      revalidatePath(`/students/${input.student_id}`)
      return { success: true, data: { id: existing.id } }
    }

    const { data, error } = await supabase
      .from('student_internal_notes')
      .insert(input as never)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating internal notes:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${input.student_id}`)
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('Error in upsertStudentInternalNotes:', err)
    return { success: false, error: 'Failed to save internal notes' }
  }
}
