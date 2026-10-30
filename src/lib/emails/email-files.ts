import { sanitizeFileName } from '@/lib/supabase/storage-paths'

/**
 * Which files count as a filed email, how big they may be and where they are
 * stored. Pure, so the browser (before upload) and the server (after upload)
 * apply exactly the same rules.
 */

export const EMAIL_BUCKET = 'filed-emails'

/** 25 MB per email file (PM decision D2); the bucket enforces the same limit. */
export const MAX_EMAIL_BYTES = 25 * 1024 * 1024

export type EmailFileSource = 'eml' | 'msg' | 'pdf'
export type EmailSource = EmailFileSource | 'manual'

const EXTENSIONS: Record<string, EmailFileSource> = { '.eml': 'eml', '.msg': 'msg', '.pdf': 'pdf' }

/** The accept attribute for the file picker. */
export const EMAIL_FILE_ACCEPT = '.eml,.msg,.pdf,message/rfc822,application/vnd.ms-outlook,application/pdf'

/**
 * Decided by extension: browsers report .eml and .msg with an empty or generic
 * MIME type, so the type is not reliable. The server checks the bytes as well.
 */
export function emailSourceForFile(fileName: string): EmailFileSource | null {
  const dot = fileName.lastIndexOf('.')
  if (dot < 0) return null
  return EXTENSIONS[fileName.slice(dot).toLowerCase()] ?? null
}

export const EMAIL_CONTENT_TYPES: Record<EmailFileSource, string> = {
  eml: 'message/rfc822',
  msg: 'application/vnd.ms-outlook',
  pdf: 'application/pdf',
}

export const SOURCE_LABELS: Record<EmailSource, string> = {
  eml: 'Email file',
  msg: 'Outlook file',
  pdf: 'PDF',
  manual: 'Typed record',
}

/** Problem with a picked file, in words for the staged card; null when it may be uploaded. */
export function emailFileProblem(file: { name: string; size: number }): string | null {
  if (!emailSourceForFile(file.name)) return 'Only .eml, .msg and PDF files can be filed'
  if (file.size === 0) return 'This file is empty'
  if (file.size > MAX_EMAIL_BYTES) return 'Files can be up to 25 MB'
  return null
}

const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]

/**
 * Checks the bytes match the claimed type, so a renamed file of another kind is
 * refused: Outlook .msg files are OLE compound documents, PDFs start with
 * "%PDF-", and an .eml starts with mail header lines.
 */
export function bytesMatchSource(bytes: Uint8Array, source: EmailFileSource): boolean {
  if (source === 'msg') return OLE_MAGIC.every((b, i) => bytes[i] === b)
  if (source === 'pdf') return new TextDecoder().decode(bytes.subarray(0, 1024)).includes('%PDF-')
  const head = new TextDecoder().decode(bytes.subarray(0, 8192)).replace(/^﻿/, '')
  return /^[\x21-\x39\x3b-\x7e]+:[ \t]?\S/.test(head) && /^(from|date|subject|message-id|to|received|mime-version):/im.test(head)
}

// Same shape as isUuid (src/lib/scheduler/uuid.ts), so any id the app accepts fits.
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const STAGING = new RegExp(`^incoming/(${UUID})/(${UUID})/([A-Za-z0-9._-]{1,200})$`, 'i')

/** Where the browser uploads a file before the server files it: one folder per user and upload. */
export function stagingPath(userId: string, uploadId: string, fileName: string): string {
  return `incoming/${userId}/${uploadId}/${safeName(fileName)}`
}

/** A staged path the given user may file, or null for anything else. */
export function ownStagingPath(path: unknown, userId: string): { fileName: string } | null {
  if (typeof path !== 'string') return null
  const match = STAGING.exec(path)
  if (!match || match[1].toLowerCase() !== userId.toLowerCase()) return null
  return { fileName: match[3] }
}

export function originalPath(emailId: string, fileName: string): string {
  return `emails/${emailId}/original_${safeName(fileName)}`
}

export function attachmentPath(emailId: string, index: number, fileName: string): string {
  return `emails/${emailId}/attachments/${index}_${safeName(fileName)}`
}

function safeName(fileName: string): string {
  const cleaned = sanitizeFileName(fileName).replace(/^\.+/, '').slice(-200)
  return cleaned || 'file'
}
