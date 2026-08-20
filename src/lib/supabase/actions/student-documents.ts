'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { buildDocumentPath } from '@/lib/supabase/storage-paths'
import { getCategoryCode, getCategoryId } from '@/lib/supabase/document-categories'

type ActionResult<T = void> = { success: boolean; data?: T; error?: string }

export type UploadDocumentInput = {
  student_id: string
  /** Either category_id or category_code must be given; the code is preferred. */
  category_id?: number
  category_code?: string
  title?: string | null
  description?: string | null
  academic_year?: string | null
}

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024

export type BatchDocumentItem = { category_id: number; title?: string | null }
export type BatchUploadResult = { uploaded: number; failed: number; errors: string[] }

/**
 * Upload several documents in one go. Files are passed as `file_0`, `file_1`, …
 * on the FormData; `items[i]` carries the category and optional display name for
 * `file_i`. Continues past individual failures and reports a summary.
 */
export async function uploadStudentDocuments(
  studentId: string,
  items: BatchDocumentItem[],
  formData: FormData
): Promise<ActionResult<BatchUploadResult>> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    let uploaded = 0
    const errors: string[] = []

    for (let i = 0; i < items.length; i++) {
      const file = formData.get(`file_${i}`) as File | null
      if (!file || file.size === 0) continue

      const label = items[i].title?.trim() || file.name
      if (!ALLOWED_MIME.includes(file.type)) {
        errors.push(`${label}: only PDF and image files are allowed`)
        continue
      }
      if (file.size > MAX_BYTES) {
        errors.push(`${label}: exceeds 10 MB limit`)
        continue
      }

      const categoryCode = await getCategoryCode(supabase, items[i].category_id)
      const filePath = buildDocumentPath({
        ownerId: studentId, categoryCode, fileName: file.name,
        disambiguator: `${Date.now()}_${i}`,
      })

      const { error: uploadError } = await supabase.storage
        .from('student-documents')
        .upload(filePath, file, { contentType: file.type, upsert: false })
      if (uploadError) {
        errors.push(`${label}: ${uploadError.message}`)
        continue
      }

      const { error: insertError } = await supabase
        .from('student_documents')
        .insert({
          student_id: studentId,
          category_id: items[i].category_id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          title: items[i].title?.trim() || null,
        } as never)

      if (insertError) {
        await supabase.storage.from('student-documents').remove([filePath])
        errors.push(`${label}: ${insertError.message}`)
        continue
      }
      uploaded++
    }

    revalidatePath(`/students/${studentId}`)
    return { success: uploaded > 0 || errors.length === 0, data: { uploaded, failed: errors.length, errors } }
  } catch (err) {
    console.error('Error in uploadStudentDocuments:', err)
    return { success: false, error: 'Failed to upload documents' }
  }
}

/** Rename a document's display title (does not touch the stored file). */
export async function renameStudentDocument(
  documentId: string,
  studentId: string,
  title: string
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('student_documents')
      .update({ title: title.trim() || null } as never)
      .eq('id', documentId)

    if (error) return { success: false, error: error.message }
    revalidatePath(`/students/${studentId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in renameStudentDocument:', err)
    return { success: false, error: 'Failed to rename document' }
  }
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

    if (!ALLOWED_MIME.includes(file.type)) return { success: false, error: 'Only PDF and image files are allowed' }
    if (file.size > MAX_BYTES) return { success: false, error: 'File exceeds 10 MB limit' }

    const categoryId = input.category_id
      ?? (input.category_code ? await getCategoryId(supabase, input.category_code) : null)
    if (!categoryId) {
      return { success: false, error: `Unknown document category: ${input.category_code ?? 'none given'}` }
    }

    const categoryCode = input.category_code ?? await getCategoryCode(supabase, categoryId)
    const filePath = buildDocumentPath({
      ownerId: input.student_id, categoryCode, fileName: file.name,
      disambiguator: Date.now(),
    })

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
        category_id: categoryId,
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
