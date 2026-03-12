'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

type ActionResult<T = void> = {
  success: boolean
  data?: T
  error?: string
}

export type CreateSchoolCourseInput = {
  school_id: string
  course_id: number
  description?: string | null
  course_date?: string | null
  school_year?: string | null
  name?: string | null
  subject?: string | null
  remarks?: string | null
}

/** Create a new course entry for a school */
export async function createSchoolCourse(
  input: CreateSchoolCourseInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('school_courses')
      .insert(input as never)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating school course:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/schools/${input.school_id}`)
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('Error in createSchoolCourse:', err)
    return { success: false, error: 'Failed to create school course' }
  }
}

/** Update an existing school course */
export async function updateSchoolCourse(
  courseId: string,
  schoolId: string,
  input: Partial<Omit<CreateSchoolCourseInput, 'school_id'>>
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('school_courses')
      .update(input as never)
      .eq('id', courseId)

    if (error) {
      console.error('Error updating school course:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/schools/${schoolId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in updateSchoolCourse:', err)
    return { success: false, error: 'Failed to update school course' }
  }
}

/** Delete a school course */
export async function deleteSchoolCourse(
  courseId: string,
  schoolId: string
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('school_courses')
      .delete()
      .eq('id', courseId)

    if (error) {
      console.error('Error deleting school course:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/schools/${schoolId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in deleteSchoolCourse:', err)
    return { success: false, error: 'Failed to delete school course' }
  }
}
