'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

type ActionResult<T = void> = { success: boolean; data?: T; error?: string }

export type UploadDocumentInput = {
  student_id: string
  category_id: number
  title?: string | null
  description?: string | null
  academic_year?: string | null
}

/** Upload a file to Supabase Storage and create a document record */
export async function uploadStudentDocument(
  input: UploadDocumentInput,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const file = formData.get('file') as File | null
    if (!file || file.size === 0) return { success: false, error: 'No file provided' }

    const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    const MAX_BYTES = 10 * 1024 * 1024
    if (!ALLOWED_MIME.includes(file.type)) return { success: false, error: 'Only PDF and image files are allowed' }
    if (file.size > MAX_BYTES) return { success: false, error: 'File exceeds 10 MB limit' }

    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${input.student_id}/${input.category_id}/${timestamp}_${safeName}`

    const { error: uploadError } = await supabase.storage
      .from('student-documents')
      .upload(filePath, file, { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return { success: false, error: uploadError.message }
    }

    const { data, error } = await supabase
      .from('student_documents')
      .insert({
        student_id: input.student_id,
        category_id: input.category_id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        title: input.title || null,
        description: input.description || null,
        academic_year: input.academic_year || null,
      } as never)
      .select('id')
      .single()

    if (error) {
      // Clean up uploaded file if DB insert fails
      await supabase.storage.from('student-documents').remove([filePath])
      return { success: false, error: error.message }
    }

    revalidatePath(`/students/${input.student_id}`)
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('Error in uploadStudentDocument:', err)
    return { success: false, error: 'Failed to upload document' }
  }
}

/** Delete a document record and its file from storage */
export async function deleteStudentDocument(documentId: string, studentId: string): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: doc, error: fetchError } = await supabase
      .from('student_documents')
      .select('file_path')
      .eq('id', documentId)
      .single()
    if (fetchError) return { success: false, error: fetchError.message }

    const { error } = await supabase
      .from('student_documents')
      .delete()
      .eq('id', documentId)

    if (error) return { success: false, error: error.message }

    // Remove file from storage
    if (doc?.file_path) {
      await supabase.storage.from('student-documents').remove([doc.file_path])
    }

    revalidatePath(`/students/${studentId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in deleteStudentDocument:', err)
    return { success: false, error: 'Failed to delete document' }
  }
}

/** Get a signed URL for downloading a document */
export async function getDocumentSignedUrl(filePath: string): Promise<ActionResult<{ url: string }>> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase.storage
      .from('student-documents')
      .createSignedUrl(filePath, 3600) // 1 hour expiry

    if (error) return { success: false, error: error.message }
    return { success: true, data: { url: data.signedUrl } }
  } catch (err) {
    console.error('Error in getDocumentSignedUrl:', err)
    return { success: false, error: 'Failed to get download URL' }
  }
}
