'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { buildDocumentPath } from '@/lib/supabase/storage-paths'
import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'

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

const ALLOWED_VIDEO_MIME = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
const MAX_VIDEO_BYTES = 50 * 1024 * 1024

/** Add a special talent entry with optional video upload */
export async function createStudentTalent(input: CreateTalentInput, formData?: FormData): Promise<ActionResult<{ id: string }>> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const file = formData?.get('video') as File | null
    if (file && file.size > 0) {
      if (!ALLOWED_VIDEO_MIME.includes(file.type)) return { success: false, error: 'Only video files (MP4, WebM, MOV, AVI) are allowed' }
      if (file.size > MAX_VIDEO_BYTES) return { success: false, error: 'Video exceeds 50 MB limit' }

      const filePath = buildDocumentPath({
        ownerId: input.student_id, categoryCode: 'talents',
        fileName: file.name, disambiguator: Date.now(),
      })

      const { error: uploadError } = await supabase.storage
        .from('student-documents')
        .upload(filePath, file, { contentType: file.type, upsert: false })

      if (uploadError) return { success: false, error: uploadError.message }
      input.video_path = filePath
      input.video_file_name = file.name
    }

    const { data, error } = await supabase
      .from('student_resume_talents')
      .insert(input as never)
      .select('id')
      .single()

    if (error) {
      if (input.video_path) await supabase.storage.from('student-documents').remove([input.video_path])
      return { success: false, error: error.message }
    }
    revalidatePath(`/students/${input.student_id}`)
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('Error in createStudentTalent:', err)
    return { success: false, error: 'Failed to create talent' }
  }
}

/** Delete a special talent entry and its video from storage */
export async function deleteStudentTalent(talentId: string, studentId: string): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: talent, error: fetchError } = await supabase
      .from('student_resume_talents')
      .select('video_path')
      .eq('id', talentId)
      .single()
    if (fetchError) return { success: false, error: fetchError.message }

    const { error } = await supabase
      .from('student_resume_talents')
      .delete()
      .eq('id', talentId)

    if (error) return { success: false, error: error.message }

    if (talent?.video_path) {
      await supabase.storage.from('student-documents').remove([talent.video_path])
    }

    revalidatePath(`/students/${studentId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in deleteStudentTalent:', err)
    return { success: false, error: 'Failed to delete talent' }
  }
}
