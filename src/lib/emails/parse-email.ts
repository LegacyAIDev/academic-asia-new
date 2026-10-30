/**
 * Reads an .eml or Outlook .msg file into one shape. Used in the browser to
 * pre-fill the form and on the server to file the email, so both see the same
 * fields. The parsers are loaded on demand to keep them out of page bundles.
 */

export type EmailAddress = { name: string; address: string }

export type ParsedAttachment = { fileName: string; mimeType: string; content: Uint8Array }

export type ParsedEmail = {
  subject: string
  from: EmailAddress | null
  to: EmailAddress[]
  cc: EmailAddress[]
  /** ISO timestamp, or null when the file carries no usable date. */
  sentAt: string | null
  text: string | null
  html: string | null
  messageId: string | null
  attachments: ParsedAttachment[]
}

/** More attachments than this are left out (and counted in `skippedAttachments`). */
export const MAX_ATTACHMENTS = 50

export async function parseEmailFile(
  bytes: ArrayBuffer,
  source: 'eml' | 'msg',
): Promise<ParsedEmail & { skippedAttachments: number }> {
  const parsed = source === 'eml' ? await parseEml(bytes) : await parseMsg(bytes)
  const skippedAttachments = Math.max(0, parsed.attachments.length - MAX_ATTACHMENTS)
  return { ...parsed, attachments: parsed.attachments.slice(0, MAX_ATTACHMENTS), skippedAttachments }
}

type PostalAddress = { name?: string; address?: string; group?: PostalAddress[] }

/** Groups ("Team: a@x, b@y;") are flattened into their members. */
function flatten(list: PostalAddress[] | undefined): EmailAddress[] {
  const out: EmailAddress[] = []
  for (const item of list ?? []) {
    if (item.group) out.push(...flatten(item.group))
    else if (item.address) out.push({ name: (item.name ?? '').trim(), address: item.address.trim() })
  }
  return out
}

async function parseEml(bytes: ArrayBuffer): Promise<ParsedEmail> {
  const { default: PostalMime } = await import('postal-mime')
  const email = await PostalMime.parse(bytes)
  const from = flatten(email.from ? [email.from as PostalAddress] : [])[0] ?? null
  return {
    subject: (email.subject ?? '').trim(),
    from,
    to: flatten(email.to as PostalAddress[] | undefined),
    cc: flatten(email.cc as PostalAddress[] | undefined),
    sentAt: validIso(email.date),
    text: email.text?.trim() || null,
    html: email.html?.trim() || null,
    messageId: email.messageId?.trim() || null,
    attachments: (email.attachments ?? []).map((a, i) => ({
      fileName: a.filename?.trim() || `attachment-${i + 1}`,
      mimeType: a.mimeType || 'application/octet-stream',
      content: typeof a.content === 'string' ? new TextEncoder().encode(a.content) : new Uint8Array(a.content),
    })),
  }
}

async function parseMsg(bytes: ArrayBuffer): Promise<ParsedEmail> {
  const mod = await import('@kenjiuno/msgreader')
  const MsgReader = mod.default
  const reader = new MsgReader(bytes)
  const data = reader.getFileData()
  if (data.error) throw new Error(`Not a readable Outlook file: ${data.error}`)

  const recipients = data.recipients ?? []
  const pick = (kind: string) =>
    recipients
      .filter(r => (r.recipType ?? 'to') === kind)
      .map(r => ({ name: (r.name ?? '').trim(), address: (r.smtpAddress || r.email || '').trim() }))
      .filter(r => r.address || r.name)
  const html = data.bodyHtml?.trim()
    || (data.html ? new TextDecoder().decode(data.html).trim() : '')

  return {
    subject: (data.subject ?? '').trim(),
    from: data.senderEmail || data.senderSmtpAddress || data.senderName
      ? {
        name: (data.senderName ?? '').trim(),
        address: (data.senderSmtpAddress || data.senderEmail || '').trim(),
      }
      : null,
    to: pick('to'),
    cc: pick('cc'),
    sentAt: validIso(data.clientSubmitTime || data.messageDeliveryTime || data.creationTime),
    text: data.body?.trim() || null,
    html: html || null,
    messageId: messageIdFromHeaders(data.headers),
    attachments: (data.attachments ?? [])
      .filter(a => !a.attachmentHidden && !a.innerMsgContent)
      .map((a, i) => {
        const file = reader.getAttachment(a)
        return {
          fileName: (file.fileName || a.fileName || a.fileNameShort || `attachment-${i + 1}`).trim(),
          mimeType: a.attachMimeTag || 'application/octet-stream',
          content: file.content,
        }
      }),
  }
}

/** Outlook keeps the original Internet headers as one string; the Message-ID is read from it. */
export function messageIdFromHeaders(headers: string | undefined): string | null {
  const match = /^message-id:[ \t]*(<[^>\r\n]{1,990}>)/im.exec(headers ?? '')
  return match ? match[1] : null
}

function validIso(value: string | undefined | null): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
