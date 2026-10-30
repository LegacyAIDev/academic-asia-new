import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { canAccess } from '@/lib/permissions/guard'
import { ATTACH_POINTS, attachAccess, isVersioned, ownerConfig, type AttachPointKey } from '@/lib/attachments/attach-points'
import { earlierVersions } from '@/lib/attachments/versions'
import { personName, type NamedPerson } from '@/lib/scheduler/person-name'

export type AttachmentRecord = {
  id: string
  file_name: string | null
  file_path: string | null
  file_size: number | null
  mime_type: string | null
  external_url: string | null
  title: string | null
  created_at: string | null
  /** Who uploaded it; null when not recorded (older uploads). */
  uploaded_by_name: string | null
  /** For versioned attach points: how many earlier versions this file replaced. */
  earlier_versions: number
}

const COLUMNS = 'id, file_name, file_path, file_size, mime_type, external_url, title, created_at, attachable_id'

type Row = Omit<AttachmentRecord, 'uploaded_by_name' | 'earlier_versions'> & {
  attachable_id: string
  uploader: NamedPerson | null
}

/**
 * Current attachments for many parent rows at once, keyed by attachable_id.
 * Replaced versions are left out; for versioned attach points each file says
 * how many earlier versions it replaced.
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
  const cfg = ownerConfig(point)
  const attachableType = ATTACH_POINTS[point].attachableType

  const [current, replaced] = await Promise.all([
    supabase
      .from(cfg.table)
      .select(`${COLUMNS}, uploader:profiles!${cfg.table}_uploaded_by_fkey(first_name, surname)`)
      .eq('attachable_type', attachableType)
      .in('attachable_id', attachableIds)
      .is('superseded_by', null)
      .order('created_at', { ascending: true }),
    isVersioned(point)
      ? supabase
        .from(cfg.table)
        .select('id, superseded_by')
        .eq('attachable_type', attachableType)
        .in('attachable_id', attachableIds)
        .not('superseded_by', 'is', null)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (current.error) {
    console.error('Error fetching record attachments:', current.error)
    return result
  }
  const links = (replaced.data ?? []) as { id: string; superseded_by: string | null }[]

  for (const row of (current.data ?? []) as unknown as Row[]) {
    const { attachable_id, uploader, ...attachment } = row
    const record: AttachmentRecord = {
      ...attachment,
      uploaded_by_name: personName(uploader) || null,
      earlier_versions: links.length ? earlierVersions(row.id, links).length : 0,
    }
    const list = result.get(attachable_id)
    if (list) list.push(record)
    else result.set(attachable_id, [record])
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
