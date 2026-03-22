'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

type ActionResult<T = void> = { success: boolean; data?: T; error?: string }

export type CreateTalentInput = {
  student_id: string
  category: 'music' | 'sports' | 'academic' | 'art' | 'others'
  instrument_sport?: string | null
  award_name?: string | null
  results?: string | null
  video_path?: string | null
  video_file_name?: string | null
}

/** Add a special talent entry */
export async function createStudentTalent(input: CreateTalentInput): Promise<ActionResult<{ id: string }>> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('student_resume_talents')
      .insert(input as never)
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }
    revalidatePath(`/students/${input.student_id}`)
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('Error in createStudentTalent:', err)
    return { success: false, error: 'Failed to create talent' }
  }
}

/** Delete a special talent entry */
export async function deleteStudentTalent(talentId: string, studentId: string): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('student_resume_talents')
      .delete()
      .eq('id', talentId)

    if (error) return { success: false, error: error.message }
    revalidatePath(`/students/${studentId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in deleteStudentTalent:', err)
    return { success: false, error: 'Failed to delete talent' }
  }
}
