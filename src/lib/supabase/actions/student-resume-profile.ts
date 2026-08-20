'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { sanitizeRichText } from '@/lib/rich-text'
import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'

type ActionResult<T = void> = { success: boolean; data?: T; error?: string }

export type UpsertResumeProfileInput = {
  student_id: string
  english_standard?: 'fluent' | 'good' | 'not_good' | null
  interests_hobbies?: string | null
  parents_input?: string | null
}

/** Create or update the resume profile for a student */
export async function upsertStudentResumeProfile(
  input: UpsertResumeProfileInput
): Promise<ActionResult<{ id: string }>> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Clean the rich text fields before they reach the database
    if (input.interests_hobbies) {
      input = { ...input, interests_hobbies: sanitizeRichText(input.interests_hobbies) }
    }
    if (input.parents_input) {
      input = { ...input, parents_input: sanitizeRichText(input.parents_input) }
    }

    const { data: existing } = await supabase
      .from('student_resume_profile')
      .select('id')
      .eq('student_id', input.student_id)
      .maybeSingle()

    if (existing) {
      const { student_id: _, ...updateFields } = input
      const { error } = await supabase
        .from('student_resume_profile')
        .update(updateFields as never)
        .eq('id', existing.id)
      if (error) return { success: false, error: error.message }
      revalidatePath(`/students/${input.student_id}`)
      return { success: true, data: { id: existing.id } }
    }

    const { data, error } = await supabase
      .from('student_resume_profile')
      .insert(input as never)
      .select('id')
      .single()
    if (error) return { success: false, error: error.message }
    revalidatePath(`/students/${input.student_id}`)
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('Error in upsertStudentResumeProfile:', err)
    return { success: false, error: 'Failed to save resume profile' }
  }
}
