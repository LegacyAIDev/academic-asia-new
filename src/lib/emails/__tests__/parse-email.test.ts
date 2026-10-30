import { describe, it, expect } from 'vitest'
import { MAX_ATTACHMENTS, messageIdFromHeaders, parseEmailFile } from '../parse-email'
import { SAMPLE_EML, sampleBytes } from './fixtures'

const buffer = (bytes: Uint8Array) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer

describe('parseEmailFile (.eml)', () => {
  it('reads the header, both bodies and the attachment', async () => {
    const email = await parseEmailFile(buffer(sampleBytes()), 'eml')
    expect(email.subject).toBe('Year 9 entry – confirmed')
    expect(email.from).toEqual({ name: 'Mrs Chan', address: 'mrs.chan@gmail.com' })
    expect(email.cc).toEqual([{ name: '', address: 'dad.chan@gmail.com' }])
    expect(email.sentAt).toBe('2026-10-27T01:15:00.000Z')
    expect(email.messageId).toBe('<abc123@mail.example.com>')
    expect(email.text).toBe('Hello Olivia, we confirm Year 9 entry.')
    expect(email.html).toContain('<b>confirm</b>')
    expect(email.attachments).toHaveLength(1)
    expect(email.attachments[0]).toMatchObject({ fileName: 'report.pdf', mimeType: 'application/pdf' })
    expect(new TextDecoder().decode(email.attachments[0].content)).toMatch(/^%PDF-1.4/)
    expect(email.skippedAttachments).toBe(0)
  })

  it('flattens address groups into their members', async () => {
    const email = await parseEmailFile(buffer(sampleBytes()), 'eml')
    expect(email.to.map(a => a.address)).toEqual(['olivia.wong@academic-asia.com', 'a@x.com', 'b@y.com'])
  })

  it('gives no date rather than a wrong one when the header is unusable', async () => {
    const raw = SAMPLE_EML.replace('Date: Tue, 27 Oct 2026 09:15:00 +0800', 'Date: whenever')
    const email = await parseEmailFile(buffer(new TextEncoder().encode(raw)), 'eml')
    expect(email.sentAt).toBeNull()
  })

  it(`keeps at most ${MAX_ATTACHMENTS} attachments and counts the rest`, async () => {
    const part = (i: number) => [
      '--b', `Content-Type: text/plain; name="a${i}.txt"`, `Content-Disposition: attachment; filename="a${i}.txt"`, '', `file ${i}`,
    ].join('\r\n')
    const raw = [
      'From: a@x.com', 'Subject: many', 'MIME-Version: 1.0', 'Content-Type: multipart/mixed; boundary="b"', '',
      '--b', 'Content-Type: text/plain', '', 'body',
      ...Array.from({ length: MAX_ATTACHMENTS + 3 }, (_, i) => part(i)), '--b--', '',
    ].join('\r\n')
    const email = await parseEmailFile(buffer(new TextEncoder().encode(raw)), 'eml')
    expect(email.attachments).toHaveLength(MAX_ATTACHMENTS)
    expect(email.skippedAttachments).toBe(3)
  })
})

describe('parseEmailFile (.msg)', () => {
  it('fails loudly on bytes that are not an Outlook file, so nothing half-read is filed', async () => {
    await expect(parseEmailFile(buffer(new TextEncoder().encode('not an outlook file at all')), 'msg')).rejects.toThrow()
  })
})

describe('messageIdFromHeaders', () => {
  it('finds the Message-ID in Outlook\'s stored Internet headers', () => {
    expect(messageIdFromHeaders('Received: x\r\nMessage-ID: <m1@outlook.com>\r\nSubject: y')).toBe('<m1@outlook.com>')
    expect(messageIdFromHeaders('message-id:<lower@case>')).toBe('<lower@case>')
    expect(messageIdFromHeaders('Subject: none')).toBeNull()
    expect(messageIdFromHeaders(undefined)).toBeNull()
  })
})
