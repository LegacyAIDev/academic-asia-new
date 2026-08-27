'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { buildDocumentPath } from '@/lib/supabase/storage-paths'
import { getCategoryId } from '@/lib/supabase/document-categories'
import { assertAccess } from '@/lib/permissions/guard'
import {
  ATTACH_POINTS, ATTACH_READ, ATTACH_WRITE, ownerConfig, ownerConfigFor,
  type AttachOwner, type AttachPointKey,
} from '@/lib/attachments/attach-points'
import { ALLOWED_MIME, MAX_BYTES, isSafeExternalUrl, urlHostname } from '@/lib/attachments/constraints'

type ActionResult<T = void> = { success: boolean; data?: T; error?: string }

/**
 * Attach an uploaded file to a specific record.
 *
 * Ordering matches the existing document uploads: put the object in storage
 * first, then insert the row, and remove the object again if that insert fails —
 * a dangling storage object is invisible and unrecoverable, a failed upload is
 * merely a retry.
 */
export async function attachFileToRecord(
  point: AttachPointKey,
  attachableId: string,
  ownerId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const cfg = ownerConfig(point)
  const denied = await assertAccess(cfg.module, ATTACH_WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const file = formData.get('file') as File | null
    if (!file || file.size === 0) return { success: false, error: 'No file provided' }
    if (!ALLOWED_MIME.includes(file.type)) {
      return { success: false, error: 'Only PDF and image files are allowed' }
    }
    if (file.size > MAX_BYTES) return { success: false, error: 'File exceeds 10 MB limit' }

    const { categoryCode, attachableType } = ATTACH_POINTS[point]
    const categoryId = await getCategoryId(supabase, categoryCode)
    if (!categoryId) return { success: false, error: `Unknown document category: ${categoryCode}` }

    const filePath = buildDocumentPath({
      ownerId, categoryCode, fileName: file.name, disambiguator: Date.now(),
    })

    const { error: uploadError } = await supabase.storage
      .from(cfg.bucket)
      .upload(filePath, file, { contentType: file.type, upsert: false })
    if (uploadError) {
      console.error('Attachment upload error:', uploadError)
      return { success: false, error: uploadError.message }
    }

    const title = (formData.get('title') as string | null)?.trim() || null

    const { data, error } = await supabase
      .from(cfg.table)
      .insert({
        [cfg.ownerColumn]: ownerId,
        category_id: categoryId,
        attachable_type: attachableType,
        attachable_id: attachableId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        title,
      } as never)
      .select('id')
      .single()

    if (error) {
      await supabase.storage.from(cfg.bucket).remove([filePath])
      return { success: false, error: error.message }
    }

    revalidatePath(cfg.detailPath(ownerId))
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('Error in attachFileToRecord:', err)
    return { success: false, error: 'Failed to attach file' }
  }
}

/** Attach an external link to a specific record. */
export async function attachLinkToRecord(
  point: AttachPointKey,
  attachableId: string,
  ownerId: string,
  url: string,
  label?: string | null,
): Promise<ActionResult<{ id: string }>> {
  const cfg = ownerConfig(point)
  const denied = await assertAccess(cfg.module, ATTACH_WRITE)
  if (denied) return denied

  try {
    const trimmed = url.trim()
    if (!isSafeExternalUrl(trimmed)) {
      return { success: false, error: 'Enter a valid http:// or https:// link' }
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { categoryCode, attachableType } = ATTACH_POINTS[point]
    const categoryId = await getCategoryId(supabase, categoryCode)
    if (!categoryId) return { success: false, error: `Unknown document category: ${categoryCode}` }

    const { data, error } = await supabase
      .from(cfg.table)
      .insert({
        [cfg.ownerColumn]: ownerId,
        category_id: categoryId,
        attachable_type: attachableType,
        attachable_id: attachableId,
        external_url: trimmed,
        // A link with no label renders as an empty row, so fall back to the host.
        title: label?.trim() || urlHostname(trimmed),
      } as never)
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath(cfg.detailPath(ownerId))
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('Error in attachLinkToRecord:', err)
    return { success: false, error: 'Failed to attach link' }
  }
}

/** Remove one attachment, and its stored object when it is a file. */
export async function deleteAttachment(
  point: AttachPointKey,
  attachmentId: string,
  ownerId: string,
): Promise<ActionResult> {
  const cfg = ownerConfig(point)
  const denied = await assertAccess(cfg.module, ATTACH_WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: row, error: fetchError } = await supabase
      .from(cfg.table)
      .select('file_path')
      .eq('id', attachmentId)
      .single()
    if (fetchError) return { success: false, error: fetchError.message }

    const { error } = await supabase.from(cfg.table).delete().eq('id', attachmentId)
    if (error) return { success: false, error: error.message }

    const filePath = (row as { file_path: string | null } | null)?.file_path
    if (filePath) await supabase.storage.from(cfg.bucket).remove([filePath])

    revalidatePath(cfg.detailPath(ownerId))
    return { success: true }
  } catch (err) {
    console.error('Error in deleteAttachment:', err)
    return { success: false, error: 'Failed to remove attachment' }
  }
}

/**
 * Remove every attachment belonging to a parent record.
 *
 * Called from the parent's delete action: the reference is polymorphic so no
 * foreign key can cascade it, and without this the rows and their files outlive
 * the record they describe.
 */
export async function deleteAttachmentsForRecord(
  point: AttachPointKey,
  attachableId: string,
  ownerId: string,
): Promise<ActionResult> {
  const cfg = ownerConfig(point)
  const denied = await assertAccess(cfg.module, ATTACH_WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: rows, error: fetchError } = await supabase
      .from(cfg.table)
      .select('id, file_path')
      .eq('attachable_type', ATTACH_POINTS[point].attachableType)
      .eq('attachable_id', attachableId)
    if (fetchError) return { success: false, error: fetchError.message }

    const list = (rows ?? []) as unknown as { id: string; file_path: string | null }[]
    if (list.length === 0) return { success: true }

    const { error } = await supabase
      .from(cfg.table)
      .delete()
      .eq('attachable_type', ATTACH_POINTS[point].attachableType)
      .eq('attachable_id', attachableId)
    if (error) return { success: false, error: error.message }

    const paths = list.map(r => r.file_path).filter((p): p is string => Boolean(p))
    if (paths.length > 0) await supabase.storage.from(cfg.bucket).remove(paths)

    revalidatePath(cfg.detailPath(ownerId))
    return { success: true }
  } catch (err) {
    console.error('Error in deleteAttachmentsForRecord:', err)
    return { success: false, error: 'Failed to remove attachments' }
  }
}

/** Short-lived download URL for a file attachment. */
export async function getAttachmentSignedUrl(
  point: AttachPointKey,
  filePath: string,
): Promise<ActionResult<{ url: string }>> {
  const cfg = ownerConfig(point)
  const denied = await assertAccess(cfg.module, ATTACH_READ)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase.storage.from(cfg.bucket).createSignedUrl(filePath, 3600)
    if (error || !data) return { success: false, error: error?.message ?? 'Could not create link' }

    return { success: true, data: { url: data.signedUrl } }
  } catch (err) {
    console.error('Error in getAttachmentSignedUrl:', err)
    return { success: false, error: 'Failed to create download link' }
  }
}

/**
 * Delete every stored object belonging to an owner.
 *
 * Deleting a student or school cascades the document *rows* through the foreign
 * key, but Postgres knows nothing about Supabase Storage, so the files survived
 * the record they belonged to. Called from deleteStudent / deleteSchool.
 *
 * Paths are {ownerId}/{categoryCode}/{file}, so the listing is two levels deep.
 */
export async function purgeOwnerStorage(
  owner: AttachOwner,
  ownerId: string,
): Promise<ActionResult> {
  const cfg = ownerConfigFor(owner)
  const denied = await assertAccess(cfg.module, ATTACH_WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: folders, error } = await supabase.storage.from(cfg.bucket).list(ownerId)
    if (error) {
      console.error('Could not list owner storage:', error)
      return { success: false, error: error.message }
    }

    const paths: string[] = []
    for (const folder of folders ?? []) {
      const prefix = `${ownerId}/${folder.name}`
      const { data: files } = await supabase.storage.from(cfg.bucket).list(prefix)
      for (const file of files ?? []) paths.push(`${prefix}/${file.name}`)
    }

    if (paths.length > 0) await supabase.storage.from(cfg.bucket).remove(paths)
    return { success: true }
  } catch (err) {
    console.error('Error in purgeOwnerStorage:', err)
    return { success: false, error: 'Failed to remove stored files' }
  }
}
