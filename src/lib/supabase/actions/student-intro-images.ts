'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'

type ActionResult<T = void> = { success: boolean; data?: T; error?: string }

const BUCKET = 'student-intro-images'
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_BYTES = 5 * 1024 * 1024

/**
 * Upload an image used inside a student's brief-intro rich text.
 * Stored in a public bucket so the returned URL embeds reliably in-app and
 * when the intro is emailed to schools.
 */
export async function uploadIntroImage(
  studentId: string,
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const file = formData.get('file') as File | null
    if (!file || file.size === 0) return { success: false, error: 'No image provided' }
    if (!ALLOWED_MIME.includes(file.type)) {
      return { success: false, error: 'Only JPG, PNG, WebP or GIF images are allowed' }
    }
    if (file.size > MAX_BYTES) return { success: false, error: 'Image exceeds 5 MB limit' }

    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${studentId}/${timestamp}_${safeName}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error('Intro image upload error:', uploadError)
      return { success: false, error: uploadError.message }
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath)
    return { success: true, data: { url: data.publicUrl } }
  } catch (err) {
    console.error('Error in uploadIntroImage:', err)
    return { success: false, error: 'Failed to upload image' }
  }
}
