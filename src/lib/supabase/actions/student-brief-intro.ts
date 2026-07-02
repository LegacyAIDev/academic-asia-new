'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { sanitizeRichText } from '@/lib/rich-text'

type ActionResult<T = void> = {
  success: boolean
  data?: T
  error?: string
}

export type UpsertBriefIntroInput = {
  student_id: string
  spoken_english_id?: number | null
  hobbies?: string | null
  subjects?: string | null
  remarks?: string | null
  is_approved?: boolean | null
  approved_at?: string | null
  approved_by?: string | null
}

/**
 * Create or update the brief intro for a student (one record per student)
 */
export async function upsertStudentBriefIntro(
  input: UpsertBriefIntroInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Clean the rich text before it ever reaches the database
    if (input.remarks) {
      input = { ...input, remarks: sanitizeRichText(input.remarks) }
    }

    const { data: existing } = await supabase
      .from('student_brief_intro')
      .select('id')
      .eq('student_id', input.student_id)
      .maybeSingle()

    if (existing) {
      const { student_id: _, ...updateFields } = input
      if (updateFields.is_approved) {
        updateFields.approved_at = new Date().toISOString()
      } else if (updateFields.is_approved === false) {
        updateFields.approved_at = null
        updateFields.approved_by = null
      }
      const { error } = await supabase
        .from('student_brief_intro')
        .update(updateFields as never)
        .eq('id', existing.id)

      if (error) {
        console.error('Error updating brief intro:', error)
        return { success: false, error: error.message }
      }

      revalidatePath(`/students/${input.student_id}`)
      return { success: true, data: { id: existing.id } }
    }

    const { data, error } = await supabase
      .from('student_brief_intro')
      .insert(input as never)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating brief intro:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${input.student_id}`)
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('Error in upsertStudentBriefIntro:', err)
    return { success: false, error: 'Failed to save brief intro' }
  }
}

/**
 * Delete the brief intro record
 */
export async function deleteStudentBriefIntro(
  introId: string,
  studentId: string
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('student_brief_intro')
      .delete()
      .eq('id', introId)

    if (error) {
      console.error('Error deleting brief intro:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${studentId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in deleteStudentBriefIntro:', err)
    return { success: false, error: 'Failed to delete brief intro' }
  }
}
