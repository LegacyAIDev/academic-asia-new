'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { assertAccess } from '@/lib/permissions/guard'
import { ATTACH_POINTS, attachAccess, ownerConfig, type AttachPointKey } from '@/lib/attachments/attach-points'

type ActionResult<T = void> = { success: boolean; data?: T; error?: string }

/** Download links normally last an hour; a link to an exam paper only long enough to open it. */
const LINK_SECONDS = 3600
const RESTRICTED_LINK_SECONDS = 300
/** A path is normally stored once; this only bounds the lookup. */
const MAX_ROWS_PER_PATH = 20

/**
 * Short-lived download URL for a file attachment.
 *
 * The path comes from the browser, so it is not signed as given: it has to be
 * the stored path of an attachment of this attach point. That way naming an
 * attach point with looser rights cannot be used to open a file that needs
 * stricter ones, such as an exam paper.
 */
export async function getAttachmentSignedUrl(
  point: AttachPointKey,
  filePath: string,
): Promise<ActionResult<{ url: string }>> {
  const cfg = ownerConfig(point)
  const access = attachAccess(point)
  const denied = await assertAccess(access.module, access.read)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: rows, error: rowError } = await supabase
      .from(cfg.table)
      .select('file_path, attachable_type')
      .eq('file_path', filePath)
      .limit(MAX_ROWS_PER_PATH + 1)
    if (rowError) return { success: false, error: rowError.message }

    // Nothing stops two rows from naming the same stored file, so all of them
    // have to belong to this attach point before the file is handed out.
    const owners = (rows ?? []) as unknown as { file_path: string | null; attachable_type: string | null }[]
    const storedPath = owners[0]?.file_path
    const allOfThisPoint = owners.every(row => row.attachable_type === ATTACH_POINTS[point].attachableType)
    // More rows than the lookup holds means some went unchecked, which is refused as well.
    if (!storedPath || !allOfThisPoint || owners.length > MAX_ROWS_PER_PATH) return { success: false, error: 'File not found' }

    const seconds = access.restricted ? RESTRICTED_LINK_SECONDS : LINK_SECONDS
    const { data, error } = await supabase.storage.from(cfg.bucket).createSignedUrl(storedPath, seconds)
    if (error || !data) return { success: false, error: error?.message ?? 'Could not create link' }

    return { success: true, data: { url: data.signedUrl } }
  } catch (err) {
    console.error('Error in getAttachmentSignedUrl:', err)
    return { success: false, error: 'Failed to create download link' }
  }
}
