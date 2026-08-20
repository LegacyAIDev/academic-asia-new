'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { buildDocumentPath } from '@/lib/supabase/storage-paths'
import { getCategoryCode } from '@/lib/supabase/document-categories'

type ActionResult<T = void> = { success: boolean; data?: T; error?: string }

const BUCKET = 'school-documents'
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024

export type SchoolBatchItem = { category_id: number; title?: string | null }
export type SchoolBatchResult = { uploaded: number; failed: number; errors: string[] }

/** Upload several school documents (files as file_0, file_1, …). */
export async function uploadSchoolDocuments(
  schoolId: string,
  items: SchoolBatchItem[],
  formData: FormData
): Promise<ActionResult<SchoolBatchResult>> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    let uploaded = 0
    const errors: string[] = []

    for (let i = 0; i < items.length; i++) {
      const file = formData.get(`file_${i}`) as File | null
      if (!file || file.size === 0) continue

      const label = items[i].title?.trim() || file.name
      if (!ALLOWED_MIME.includes(file.type)) { errors.push(`${label}: only PDF and image files are allowed`); continue }
      if (file.size > MAX_BYTES) { errors.push(`${label}: exceeds 10 MB limit`); continue }

      const categoryCode = await getCategoryCode(supabase, items[i].category_id)
      const filePath = buildDocumentPath({
        ownerId: schoolId, categoryCode, fileName: file.name,
        disambiguator: `${Date.now()}_${i}`,
      })

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file, { contentType: file.type, upsert: false })
      if (uploadError) { errors.push(`${label}: ${uploadError.message}`); continue }

      const { error: insertError } = await supabase
        .from('school_documents')
        .insert({
          school_id: schoolId,
          category_id: items[i].category_id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          title: items[i].title?.trim() || null,
        } as never)

      if (insertError) {
        await supabase.storage.from(BUCKET).remove([filePath])
        errors.push(`${label}: ${insertError.message}`)
        continue
      }
      uploaded++
    }

    revalidatePath(`/schools/${schoolId}`)
    return { success: uploaded > 0 || errors.length === 0, data: { uploaded, failed: errors.length, errors } }
  } catch (err) {
    console.error('Error in uploadSchoolDocuments:', err)
    return { success: false, error: 'Failed to upload documents' }
  }
}

/** Rename a school document's display title. */
export async function renameSchoolDocument(
  documentId: string,
  schoolId: string,
  title: string
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { error } = await supabase
      .from('school_documents')
      .update({ title: title.trim() || null } as never)
      .eq('id', documentId)
    if (error) return { success: false, error: error.message }
    revalidatePath(`/schools/${schoolId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in renameSchoolDocument:', err)
    return { success: false, error: 'Failed to rename document' }
  }
}

/** Delete a school document (row + stored file). */
export async function deleteSchoolDocument(documentId: string, schoolId: string): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: doc } = await supabase
      .from('school_documents').select('file_path').eq('id', documentId).single()

    const { error } = await supabase.from('school_documents').delete().eq('id', documentId)
    if (error) return { success: false, error: error.message }

    if (doc?.file_path) await supabase.storage.from(BUCKET).remove([doc.file_path])
    revalidatePath(`/schools/${schoolId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in deleteSchoolDocument:', err)
    return { success: false, error: 'Failed to delete document' }
  }
}

/** Signed URL for downloading a school document. */
export async function getSchoolDocumentSignedUrl(filePath: string): Promise<ActionResult<{ url: string }>> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 3600)
    if (error) return { success: false, error: error.message }
    return { success: true, data: { url: data.signedUrl } }
  } catch (err) {
    console.error('Error in getSchoolDocumentSignedUrl:', err)
    return { success: false, error: 'Failed to get download URL' }
  }
}
