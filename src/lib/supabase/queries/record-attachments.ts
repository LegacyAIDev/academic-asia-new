import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { canAccess } from '@/lib/permissions/guard'
import { ATTACH_POINTS, attachAccess, ownerConfig, type AttachPointKey } from '@/lib/attachments/attach-points'

export type AttachmentRecord = {
  id: string
  file_name: string | null
  file_path: string | null
  file_size: number | null
  mime_type: string | null
  external_url: string | null
  title: string | null
}

const COLUMNS = 'id, file_name, file_path, file_size, mime_type, external_url, title'

/**
 * Attachments for many parent rows at once, keyed by attachable_id.
 *
 * Batched on purpose: the fees and entrance exam tabs render dozens of rows and
 * a per-row query would be dozens of round trips on every page load.
 *
 * The right to see the files is checked here rather than in each page, so no
 * caller can forget it: a user without it simply gets no attachments back, and
 * neither file names nor paths reach the browser.
 */
export async function getAttachmentsForMany(
  point: AttachPointKey,
  attachableIds: string[],
): Promise<Map<string, AttachmentRecord[]>> {
  const result = new Map<string, AttachmentRecord[]>()
  if (attachableIds.length === 0) return result

  const access = attachAccess(point)
  if (!(await canAccess(access.module, access.read))) return result

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from(ownerConfig(point).table)
    .select(`${COLUMNS}, attachable_id`)
    .eq('attachable_type', ATTACH_POINTS[point].attachableType)
    .in('attachable_id', attachableIds)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching record attachments:', error)
    return result
  }

  for (const row of (data ?? []) as unknown as (AttachmentRecord & { attachable_id: string })[]) {
    const { attachable_id, ...attachment } = row
    const list = result.get(attachable_id)
    if (list) list.push(attachment)
    else result.set(attachable_id, [attachment])
  }
  return result
}

/** Attachments for a single parent row. */
export async function getAttachmentsFor(
  point: AttachPointKey,
  attachableId: string | null,
): Promise<AttachmentRecord[]> {
  if (!attachableId) return []
  const byId = await getAttachmentsForMany(point, [attachableId])
  return byId.get(attachableId) ?? []
}
