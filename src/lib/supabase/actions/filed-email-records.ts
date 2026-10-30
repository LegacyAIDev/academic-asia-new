'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { getCurrentUser } from '@/lib/supabase/auth'
import { ADMIN_LEVELS, hasMinLevel } from '@/lib/auth-utils'
import { isUuid } from '@/lib/scheduler/uuid'
import { anyAllowed, emailModules, firstDenied, writeChecks, writeChecksForChange } from '@/lib/emails/email-access'
import { EMAIL_BUCKET } from '@/lib/emails/email-files'
import { detailColumns, emailDetailsSchema, emailLinksSchema, firstIssue, linkColumns } from '@/lib/emails/email-schema'
import { DETAIL_SELECT, storedAttachments, toFiledEmailDetail, type FiledEmailDetail, type FiledEmailRow } from '@/lib/emails/filed-email'
import { applicationBelongsTo, removeStoredFiles, revalidateEmailPages } from '@/lib/supabase/filed-email-store'
import { getApplicationOptions, searchSchoolOptions, type ApplicationOption } from '@/lib/supabase/queries/filed-emails'
import type { ActionResult } from '@/lib/scheduler/action-helpers'

/** Opening, editing, archiving and removing a filed email (EF-13, EF-17 to EF-23). */

const NOT_FOUND = { success: false as const, error: 'Email not found' }
const FAILED = { success: false as const, error: 'Something went wrong. Please try again.' }
type Supabase = ReturnType<typeof createClient>
type Current = {
  id: string; student_id: string | null; school_id: string | null; application_id: string | null
  file_path: string | null; file_name: string | null; attachments: unknown; archived_at: string | null
}

async function loadCurrent(supabase: Supabase, id: string): Promise<Current | null> {
  if (!isUuid(id)) return null
  const { data } = await supabase
    .from('filed_emails')
    .select('id, student_id, school_id, application_id, file_path, file_name, attachments, archived_at')
    .eq('id', id)
    .maybeSingle()
  return (data as Current | null) ?? null
}

const linksOf = (row: Current) => ({ studentId: row.student_id, schoolId: row.school_id, applicationId: row.application_id })

/** The whole email for the viewer: header, cleaned body and attachment names. */
export async function getFiledEmailDetail(id: string): Promise<ActionResult<FiledEmailDetail>> {
  try {
    const supabase = createClient(await cookies())
    const current = await loadCurrent(supabase, id)
    if (!current) return NOT_FOUND
    const denied = await anyAllowed(emailModules(linksOf(current)), m => assertAccess(m, ACCESS.READ))
    if (denied) return denied
    const { data, error } = await supabase.from('filed_emails').select(DETAIL_SELECT).eq('id', id).single()
    if (error || !data) return NOT_FOUND
    return { success: true, data: toFiledEmailDetail(data as unknown as FiledEmailRow) }
  } catch (err) {
    console.error('Error in getFiledEmailDetail:', err)
    return FAILED
  }
}

/** A one-minute link to the original file or to one attachment, signed from the stored path only. */
export async function getFiledEmailFileUrl(id: string, part: 'original' | number): Promise<ActionResult<{ url: string }>> {
  try {
    const supabase = createClient(await cookies())
    const current = await loadCurrent(supabase, id)
    if (!current) return NOT_FOUND
    const denied = await anyAllowed(emailModules(linksOf(current)), m => assertAccess(m, ACCESS.READ))
    if (denied) return denied

    const attachment = typeof part === 'number' ? storedAttachments(current.attachments)[part] : null
    const path = part === 'original' ? current.file_path : attachment?.path
    const name = part === 'original' ? current.file_name : attachment?.name
    if (!path || !name) return { success: false, error: 'File not found' }
    const inline = attachment && /^(application\/pdf|image\/(jpeg|png|webp|gif))$/.test(attachment.mime)
    const { data, error } = await supabase.storage.from(EMAIL_BUCKET).createSignedUrl(path, 60, inline ? undefined : { download: name })
    if (error || !data) return { success: false, error: 'Could not open the file.' }
    return { success: true, data: { url: data.signedUrl } }
  } catch (err) {
    console.error('Error in getFiledEmailFileUrl:', err)
    return FAILED
  }
}

/** Corrects the details and links of an email; the stored file never changes (EF-13, EF-21). */
export async function updateFiledEmail(id: string, input: { links: unknown; details: unknown }): Promise<ActionResult> {
  try {
    const supabase = createClient(await cookies())
    const current = await loadCurrent(supabase, id)
    if (!current) return NOT_FOUND
    const links = emailLinksSchema.safeParse(input?.links)
    if (!links.success) return { success: false, error: firstIssue(links.error) }
    const denied = await firstDenied(writeChecksForChange(linksOf(current), links.data), (m, level) => assertAccess(m, level))
    if (denied) return denied
    const details = emailDetailsSchema.safeParse(input.details)
    if (!details.success) return { success: false, error: firstIssue(details.error) }
    if (links.data.applicationId && !(await applicationBelongsTo(supabase, links.data.applicationId, links.data.studentId!))) {
      return { success: false, error: 'That application belongs to another student' }
    }

    const { data: auth } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('filed_emails')
      .update({ ...detailColumns(details.data), ...linkColumns(links.data), updated_by: auth.user?.id ?? null })
      .eq('id', id)
    if (error) {
      if (error.code === '23505') return { success: false, error: 'This email is already filed on that record.' }
      console.error('Error updating a filed email:', error.message)
      return FAILED
    }
    revalidateEmailPages(linksOf(current), links.data)
    return { success: true }
  } catch (err) {
    console.error('Error in updateFiledEmail:', err)
    return FAILED
  }
}

/** Hides or brings back an email (D5: staff with write access archive, nothing is lost). */
export async function setFiledEmailArchived(id: string, archived: boolean): Promise<ActionResult> {
  try {
    const supabase = createClient(await cookies())
    const current = await loadCurrent(supabase, id)
    if (!current) return NOT_FOUND
    const denied = await firstDenied(writeChecks(linksOf(current)), (m, level) => assertAccess(m, level))
    if (denied) return denied
    const { data: auth } = await supabase.auth.getUser()
    const me = auth.user?.id ?? null
    const { error } = await supabase
      .from('filed_emails')
      .update(archived
        ? { archived_at: new Date().toISOString(), archived_by: me, updated_by: me }
        : { archived_at: null, archived_by: null, updated_by: me })
      .eq('id', id)
    if (error) {
      if (error.code === '23505') return { success: false, error: 'The same email is filed here again; archive that copy first.' }
      console.error('Error archiving a filed email:', error.message)
      return FAILED
    }
    revalidateEmailPages(linksOf(current))
    return { success: true }
  } catch (err) {
    console.error('Error in setFiledEmailArchived:', err)
    return FAILED
  }
}

/** Permanent removal, file and record: Managers and above only (D5, SEC-04). */
export async function deleteFiledEmail(id: string): Promise<ActionResult> {
  try {
    const supabase = createClient(await cookies())
    const current = await loadCurrent(supabase, id)
    if (!current) return NOT_FOUND
    const denied = await firstDenied(writeChecks(linksOf(current)), (m, level) => assertAccess(m, level))
    if (denied) return denied
    const me = await getCurrentUser()
    if (!hasMinLevel(me?.admin_level, ADMIN_LEVELS.MANAGER)) {
      return { success: false, error: 'Only managers can delete an email for good. Archive it instead.' }
    }
    const { error } = await supabase.from('filed_emails').delete().eq('id', id)
    if (error) {
      console.error('Error deleting a filed email:', error.message)
      return FAILED
    }
    const paths = [current.file_path, ...storedAttachments(current.attachments).map(a => a.path)]
    await removeStoredFiles(supabase, paths.filter((p): p is string => !!p))
    revalidateEmailPages(linksOf(current))
    return { success: true }
  } catch (err) {
    console.error('Error in deleteFiledEmail:', err)
    return FAILED
  }
}

/** A student's applications for the link choices; seeing students is enough. */
export async function listApplicationOptions(studentId: string): Promise<ActionResult<ApplicationOption[]>> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.READ)
  if (denied) return denied
  if (!isUuid(studentId)) return { success: true, data: [] }
  return { success: true, data: await getApplicationOptions(studentId) }
}

/** Schools by name for the link picker; seeing schools is enough. */
export async function searchSchoolsForEmail(query: string): Promise<ActionResult<{ id: string; name: string }[]>> {
  const denied = await assertAccess(MODULES.SCHOOLS, ACCESS.READ)
  if (denied) return denied
  if (typeof query !== 'string') return { success: false, error: 'Invalid search' }
  try {
    return { success: true, data: await searchSchoolOptions(query) }
  } catch (err) {
    console.error('Error in searchSchoolsForEmail:', err)
    return { success: false, error: 'Failed to search schools' }
  }
}
