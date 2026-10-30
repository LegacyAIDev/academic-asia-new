'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { buildDocumentPath } from '@/lib/supabase/storage-paths'
import { assertAccess } from '@/lib/permissions/guard'
import { ATTACH_POINTS, attachAccess, isVersioned, ownerConfig, type AttachPointKey } from '@/lib/attachments/attach-points'
import { ALLOWED_MIME, MAX_BYTES } from '@/lib/attachments/constraints'
import { earlierVersions } from '@/lib/attachments/versions'
import { isUuid } from '@/lib/scheduler/uuid'
import { personName, type NamedPerson } from '@/lib/scheduler/person-name'
import type { ActionResult } from '@/lib/scheduler/action-helpers'

/**
 * Replacing a paper with a newer version (ASM-03, ASM-05). The new file is
 * stored as a new row next to the old one, and the old row is marked as
 * replaced by it, so the history keeps every earlier file with who uploaded
 * it and when. Only attach points marked `versioned` (exam papers) allow it.
 */

const NOT_FOUND = { success: false as const, error: 'Attachment not found' }

type CurrentRow = {
  id: string; attachable_id: string; category_id: number; title: string | null; file_path: string | null
  superseded_by: string | null
}

export type AttachmentVersion = {
  id: string
  name: string
  fileSize: number | null
  uploadedAt: string
  uploadedBy: string | null
  replacedAt: string | null
  /** Path to open it with getAttachmentSignedUrl; checked again there. */
  filePath: string | null
}

export async function replaceAttachmentFile(
  point: AttachPointKey,
  attachmentId: string,
  ownerId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const access = attachAccess(point)
  const denied = await assertAccess(access.module, access.write)
  if (denied) return denied
  if (!isVersioned(point)) return { success: false, error: 'These files cannot be replaced' }
  if (!isUuid(String(attachmentId)) || !isUuid(String(ownerId))) return NOT_FOUND

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { success: false, error: 'No file provided' }
  if (!ALLOWED_MIME.includes(file.type)) return { success: false, error: 'Only PDF and image files are allowed' }
  if (file.size > MAX_BYTES) return { success: false, error: 'File exceeds 10 MB limit' }

  try {
    const supabase = createClient(await cookies())
    const cfg = ownerConfig(point)
    const { data: auth } = await supabase.auth.getUser()

    // The row must be a current file of this attach point and this owner.
    const { data: current } = await supabase
      .from(cfg.table)
      .select('id, attachable_id, category_id, title, file_path, superseded_by')
      .eq('id', attachmentId)
      .eq('attachable_type', ATTACH_POINTS[point].attachableType)
      .eq(cfg.ownerColumn, ownerId)
      .maybeSingle()
    const row = current as CurrentRow | null
    if (!row || !row.file_path) return NOT_FOUND
    if (row.superseded_by) return { success: false, error: 'A newer version has already replaced this file. Refresh the page.' }

    const filePath = buildDocumentPath({
      ownerId, categoryCode: ATTACH_POINTS[point].categoryCode, fileName: file.name, disambiguator: Date.now(),
    })
    const { error: uploadError } = await supabase.storage.from(cfg.bucket).upload(filePath, file, { contentType: file.type, upsert: false })
    if (uploadError) return { success: false, error: 'Could not store the new version. Please try again.' }

    const { data: inserted, error: insertError } = await supabase
      .from(cfg.table)
      .insert({
        [cfg.ownerColumn]: ownerId,
        category_id: row.category_id,
        attachable_type: ATTACH_POINTS[point].attachableType,
        attachable_id: row.attachable_id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        title: row.title,
        uploaded_by: auth.user?.id ?? null,
      } as never)
      .select('id')
      .single()
    if (insertError || !inserted) {
      await supabase.storage.from(cfg.bucket).remove([filePath])
      return { success: false, error: 'Could not save the new version. Please try again.' }
    }
    const newId = (inserted as { id: string }).id

    // Only replaces a row that is still current, so two people replacing at once cannot fork the history.
    const { data: marked, error: markError } = await supabase
      .from(cfg.table)
      .update({ superseded_by: newId, superseded_at: new Date().toISOString() } as never)
      .eq('id', row.id)
      .is('superseded_by', null)
      .select('id')
    if (markError || !marked?.length) {
      await supabase.from(cfg.table).delete().eq('id', newId)
      await supabase.storage.from(cfg.bucket).remove([filePath])
      return { success: false, error: 'Someone else replaced this file at the same time. Refresh the page and try again.' }
    }

    revalidatePath(cfg.detailPath(ownerId))
    return { success: true, data: { id: newId } }
  } catch (err) {
    console.error('Error in replaceAttachmentFile:', err)
    return { success: false, error: 'Could not replace the file. Please try again.' }
  }
}

/** Earlier versions of a current file, newest first, with who uploaded each and when. */
export async function listAttachmentVersions(
  point: AttachPointKey,
  attachmentId: string,
): Promise<ActionResult<AttachmentVersion[]>> {
  const access = attachAccess(point)
  const denied = await assertAccess(access.module, access.read)
  if (denied) return denied
  if (!isVersioned(point) || !isUuid(String(attachmentId))) return NOT_FOUND

  try {
    const supabase = createClient(await cookies())
    const cfg = ownerConfig(point)
    const { data: current } = await supabase
      .from(cfg.table)
      .select('attachable_id')
      .eq('id', attachmentId)
      .eq('attachable_type', ATTACH_POINTS[point].attachableType)
      .maybeSingle()
    if (!current) return NOT_FOUND

    const { data, error } = await supabase
      .from(cfg.table)
      .select(`id, title, file_name, file_size, file_path, created_at, superseded_by, superseded_at,
        uploader:profiles!${cfg.table}_uploaded_by_fkey(first_name, surname)`)
      .eq('attachable_type', ATTACH_POINTS[point].attachableType)
      .eq('attachable_id', (current as { attachable_id: string }).attachable_id)
      .not('superseded_by', 'is', null)
    if (error) return { success: false, error: 'Could not load the earlier versions.' }

    type Row = {
      id: string; title: string | null; file_name: string | null; file_size: number | null; file_path: string | null
      created_at: string; superseded_by: string | null; superseded_at: string | null; uploader: NamedPerson | null
    }
    const chain = earlierVersions(attachmentId, (data ?? []) as unknown as Row[])
    return {
      success: true,
      data: chain.map(v => ({
        id: v.id,
        name: v.file_name || v.title || 'Paper',
        fileSize: v.file_size,
        uploadedAt: v.created_at,
        uploadedBy: personName(v.uploader) || null,
        replacedAt: v.superseded_at,
        filePath: v.file_path,
      })),
    }
  } catch (err) {
    console.error('Error in listAttachmentVersions:', err)
    return { success: false, error: 'Could not load the earlier versions.' }
  }
}
