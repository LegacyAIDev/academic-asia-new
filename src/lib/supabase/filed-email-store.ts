import 'server-only'
import { revalidatePath } from 'next/cache'
import type { createClient } from '@/lib/supabase/server'
import {
  EMAIL_BUCKET, MAX_EMAIL_BYTES, attachmentPath, bytesMatchSource, emailSourceForFile, originalPath,
} from '@/lib/emails/email-files'
import { parseEmailFile } from '@/lib/emails/parse-email'
import { htmlToText, limitBodyText, sanitizeEmailHtml } from '@/lib/emails/email-body'
import type { StoredAttachment } from '@/lib/emails/filed-email'
import { isUuid } from '@/lib/scheduler/uuid'

type Supabase = ReturnType<typeof createClient>

/** Attachment types the browser may open in a tab; anything else is stored to download only. */
const INLINE_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export type StoredEmailFile = {
  columns: {
    source: 'eml' | 'msg' | 'pdf'
    file_path: string
    file_name: string
    file_size: number
    body_text: string | null
    body_html: string | null
    message_id: string | null
    attachments: StoredAttachment[]
  }
  /** Everything written to storage, removed again if the database insert fails. */
  paths: string[]
  skippedAttachments: number
}

/**
 * Turns a file the browser staged into a stored email: checks it is what its
 * name says, reads it, cleans the body, stores its attachments and moves the
 * original next to them. On any failure nothing is left behind in storage
 * except the staged upload, which the caller removes.
 */
export async function storeStagedEmail(
  supabase: Supabase,
  input: { emailId: string; stagedPath: string; fileName: string },
): Promise<StoredEmailFile | { error: string }> {
  const source = emailSourceForFile(input.fileName)
  if (!source) return { error: 'Only .eml, .msg and PDF files can be filed' }

  const { data: blob, error: downloadError } = await supabase.storage.from(EMAIL_BUCKET).download(input.stagedPath)
  if (downloadError || !blob) return { error: 'The upload could not be found. Please try again.' }
  if (blob.size === 0 || blob.size > MAX_EMAIL_BYTES) return { error: 'Files can be up to 25 MB' }

  const buffer = await blob.arrayBuffer()
  if (!bytesMatchSource(new Uint8Array(buffer), source)) {
    return { error: `This file is not a real ${source === 'pdf' ? 'PDF' : `.${source} email`}` }
  }

  let parsed: Awaited<ReturnType<typeof parseEmailFile>> | null = null
  if (source !== 'pdf') {
    try {
      parsed = await parseEmailFile(buffer, source)
    } catch (err) {
      console.error('Could not read a filed email:', err instanceof Error ? err.message : 'unknown error')
      return { error: 'This email file could not be read. Try saving it again from Outlook or as a PDF.' }
    }
  }

  const written: string[] = []
  const attachments: StoredAttachment[] = []
  for (const [i, a] of (parsed?.attachments ?? []).entries()) {
    const path = attachmentPath(input.emailId, i, a.fileName)
    const mime = a.mimeType.toLowerCase()
    const { error } = await supabase.storage.from(EMAIL_BUCKET).upload(path, a.content, {
      contentType: INLINE_TYPES.has(mime) ? mime : 'application/octet-stream',
      upsert: false,
    })
    if (error) {
      await removeStoredFiles(supabase, written)
      return { error: 'The attachments could not be saved. Please try again.' }
    }
    written.push(path)
    attachments.push({ name: a.fileName.slice(0, 255), size: a.content.byteLength, mime, path })
  }

  const finalPath = originalPath(input.emailId, input.fileName)
  const { error: moveError } = await supabase.storage.from(EMAIL_BUCKET).move(input.stagedPath, finalPath)
  if (moveError) {
    await removeStoredFiles(supabase, written)
    return { error: 'The email could not be saved. Please try again.' }
  }
  written.push(finalPath)

  const html = parsed?.html ? sanitizeEmailHtml(parsed.html) : ''
  const text = parsed?.text || (parsed?.html ? htmlToText(parsed.html) : '')
  return {
    columns: {
      source,
      file_path: finalPath,
      file_name: input.fileName.slice(0, 255),
      file_size: blob.size,
      body_text: limitBodyText(text || null),
      body_html: html || null,
      message_id: parsed?.messageId?.slice(0, 998) ?? null,
      attachments,
    },
    paths: written,
    skippedAttachments: parsed?.skippedAttachments ?? 0,
  }
}

export async function removeStoredFiles(supabase: Supabase, paths: string[]): Promise<void> {
  if (paths.length === 0) return
  const { error } = await supabase.storage.from(EMAIL_BUCKET).remove(paths)
  if (error) console.error('Could not remove filed email files:', error.message)
}

/** The live email with this Message-ID already filed on the same student or school, if any. */
export async function findDuplicate(
  supabase: Supabase,
  links: { studentId: string | null; schoolId: string | null },
  messageId: string | null,
): Promise<{ subject: string; sent_at: string } | null> {
  if (!messageId) return null
  // Ids go into a filter string below; callers validate them, and this checks again.
  if ((links.studentId && !isUuid(links.studentId)) || (links.schoolId && !isUuid(links.schoolId))) return null
  const owners = [
    links.studentId ? `student_id.eq.${links.studentId}` : null,
    links.schoolId ? `school_id.eq.${links.schoolId}` : null,
  ].filter(Boolean).join(',')
  if (!owners) return null
  const { data } = await supabase
    .from('filed_emails')
    .select('subject, sent_at')
    .eq('message_id', messageId)
    .is('archived_at', null)
    .or(owners)
    .limit(1)
  return data?.[0] ?? null
}

type PageLinks = { studentId?: string | null; schoolId?: string | null; applicationId?: string | null }

/** Refreshes every page that shows the email, before and after a change of links. */
export function revalidateEmailPages(...linkSets: PageLinks[]): void {
  const paths = new Set<string>()
  for (const links of linkSets) {
    if (links.studentId) paths.add(`/students/${links.studentId}`)
    if (links.schoolId) paths.add(`/schools/${links.schoolId}`)
    if (links.studentId && links.applicationId) paths.add(`/students/${links.studentId}/applications/${links.applicationId}`)
  }
  for (const path of paths) revalidatePath(path)
}

/** An application may only be linked together with the student it belongs to. */
export async function applicationBelongsTo(supabase: Supabase, applicationId: string, studentId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('student_applications')
    .select('id')
    .eq('id', applicationId)
    .eq('student_id', studentId)
    .maybeSingle()
  return !error && !!data
}
