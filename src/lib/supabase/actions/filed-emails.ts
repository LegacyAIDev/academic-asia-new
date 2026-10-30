'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { assertAccess } from '@/lib/permissions/guard'
import { firstDenied, writeChecks } from '@/lib/emails/email-access'
import { EMAIL_BUCKET, emailFileProblem, emailSourceForFile, ownStagingPath, stagingPath } from '@/lib/emails/email-files'
import { formatEmailDate } from '@/lib/emails/email-form'
import {
  detailColumns, emailLinksSchema, fileEmailSchema, firstIssue, linkColumns, manualEmailSchema, type EmailLinks,
} from '@/lib/emails/email-schema'
import {
  applicationBelongsTo, findDuplicate, removeStoredFiles, revalidateEmailPages, storeStagedEmail,
} from '@/lib/supabase/filed-email-store'
import type { ActionResult } from '@/lib/scheduler/action-helpers'

/**
 * Filing an email (EF-01 to EF-12). The browser uploads the file straight to
 * private storage through a one-time signed link, because a 25 MB email cannot
 * pass through a server action or a hosting request body. The server then reads
 * the stored copy itself; nothing the browser parsed is trusted for the body.
 */

const SIGN_IN_AGAIN = { success: false as const, error: 'Please sign in again.' }
const duplicateError = (d: { subject: string; sent_at: string }) => ({
  success: false as const,
  error: `Already filed here: "${d.subject}" (${formatEmailDate(d.sent_at)})`,
})

type Supabase = ReturnType<typeof createClient>

async function checkLinks(supabase: Supabase, raw: unknown): Promise<{ links: EmailLinks } | { error: string }> {
  const parsed = emailLinksSchema.safeParse(raw)
  if (!parsed.success) return { error: firstIssue(parsed.error) }
  const links = parsed.data
  if (links.applicationId && !(await applicationBelongsTo(supabase, links.applicationId, links.studentId!))) {
    return { error: 'That application belongs to another student' }
  }
  return { links }
}

/** A one-time upload link for one email file, after checking rights, file and duplicates. */
export async function prepareEmailUpload(input: {
  links: unknown
  fileName: string
  size: number
  messageId?: string | null
}): Promise<ActionResult<{ path: string; token: string }>> {
  const quick = emailLinksSchema.safeParse(input?.links)
  if (!quick.success) return { success: false, error: firstIssue(quick.error) }
  const denied = await firstDenied(writeChecks(quick.data), (m, level) => assertAccess(m, level))
  if (denied) return denied

  const problem = emailFileProblem({ name: String(input.fileName ?? ''), size: Number(input.size) })
  if (problem) return { success: false, error: problem }

  try {
    const supabase = createClient(await cookies())
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return SIGN_IN_AGAIN

    const checked = await checkLinks(supabase, input.links)
    if ('error' in checked) return { success: false, error: checked.error }
    const messageId = typeof input.messageId === 'string' ? input.messageId.slice(0, 998) : null
    const duplicate = await findDuplicate(supabase, checked.links, messageId)
    if (duplicate) return duplicateError(duplicate)

    const path = stagingPath(auth.user.id, crypto.randomUUID(), input.fileName)
    const { data, error } = await supabase.storage.from(EMAIL_BUCKET).createSignedUploadUrl(path)
    if (error || !data) {
      console.error('Error creating an email upload link:', error?.message)
      return { success: false, error: 'Could not start the upload. Please try again.' }
    }
    return { success: true, data: { path: data.path ?? path, token: data.token } }
  } catch (err) {
    console.error('Error in prepareEmailUpload:', err)
    return { success: false, error: 'Could not start the upload. Please try again.' }
  }
}

/** Files an uploaded email: reads it on the server, stores its parts and saves the record. */
export async function fileEmail(input: { links: unknown; details: unknown }): Promise<ActionResult<{ id: string }>> {
  const quick = emailLinksSchema.safeParse(input?.links)
  if (!quick.success) return { success: false, error: firstIssue(quick.error) }
  const denied = await firstDenied(writeChecks(quick.data), (m, level) => assertAccess(m, level))
  if (denied) return denied
  const details = fileEmailSchema.safeParse(input.details)
  if (!details.success) return { success: false, error: firstIssue(details.error) }

  let discardStaged = async () => {}
  try {
    const supabase = createClient(await cookies())
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return SIGN_IN_AGAIN
    const staged = ownStagingPath(details.data.stagedPath, auth.user.id)
    if (!staged) return { success: false, error: 'Upload not found' }
    // The display name comes from the request, so it must at least claim the type that was staged.
    if (emailSourceForFile(staged.fileName) !== emailSourceForFile(details.data.fileName)) {
      return { success: false, error: 'Upload not found' }
    }
    discardStaged = () => removeStoredFiles(supabase, [details.data.stagedPath])

    const checked = await checkLinks(supabase, input.links)
    if ('error' in checked) {
      await discardStaged()
      return { success: false, error: checked.error }
    }
    const emailId = crypto.randomUUID()
    const stored = await storeStagedEmail(supabase, { emailId, stagedPath: details.data.stagedPath, fileName: details.data.fileName })
    if ('error' in stored) {
      await discardStaged()
      return { success: false, error: stored.error }
    }
    const duplicate = await findDuplicate(supabase, checked.links, stored.columns.message_id)
    if (duplicate) {
      await removeStoredFiles(supabase, stored.paths)
      return duplicateError(duplicate)
    }

    const { error } = await supabase.from('filed_emails').insert({
      id: emailId, ...detailColumns(details.data), ...linkColumns(checked.links), ...stored.columns, created_by: auth.user.id,
    })
    if (error) {
      await removeStoredFiles(supabase, stored.paths)
      if (error.code === '23505') return { success: false, error: 'This email is already filed here.' }
      console.error('Error saving a filed email:', error.message)
      return { success: false, error: 'Could not save the email. Please try again.' }
    }
    revalidateEmailPages(checked.links)
    return { success: true, data: { id: emailId } }
  } catch (err) {
    console.error('Error in fileEmail:', err)
    await discardStaged()
    return { success: false, error: 'Could not save the email. Please try again.' }
  }
}

/** A typed record for an email that cannot be exported (EF-08, STU-10, COM-03). */
export async function createManualEmail(input: { links: unknown; details: unknown }): Promise<ActionResult<{ id: string }>> {
  const quick = emailLinksSchema.safeParse(input?.links)
  if (!quick.success) return { success: false, error: firstIssue(quick.error) }
  const denied = await firstDenied(writeChecks(quick.data), (m, level) => assertAccess(m, level))
  if (denied) return denied
  const details = manualEmailSchema.safeParse(input.details)
  if (!details.success) return { success: false, error: firstIssue(details.error) }

  try {
    const supabase = createClient(await cookies())
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return SIGN_IN_AGAIN
    const checked = await checkLinks(supabase, input.links)
    if ('error' in checked) return { success: false, error: checked.error }

    const { data, error } = await supabase
      .from('filed_emails')
      .insert({
        ...detailColumns(details.data), ...linkColumns(checked.links),
        source: 'manual', body_text: details.data.body, created_by: auth.user.id,
      })
      .select('id')
      .single()
    if (error || !data) {
      console.error('Error saving a typed email record:', error?.message)
      return { success: false, error: 'Could not save the record. Please try again.' }
    }
    revalidateEmailPages(checked.links)
    return { success: true, data: { id: data.id } }
  } catch (err) {
    console.error('Error in createManualEmail:', err)
    return { success: false, error: 'Could not save the record. Please try again.' }
  }
}
