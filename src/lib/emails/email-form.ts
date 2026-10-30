import { TZDate } from '@date-fns/tz'
import { format } from 'date-fns'
import { SCHEDULER_TIMEZONE } from '@/lib/scheduler/config'
import type { EmailAddress } from './parse-email'

/**
 * Small pure helpers behind the email form: turning addresses into the text
 * staff edit and back, Hong Kong local time to an instant and back, and which
 * way an email went.
 */

export type EmailDirection = 'received' | 'sent'

/** Academic Asia's own mail domains: a message from one of them was sent by us. */
export const OWN_EMAIL_DOMAINS = ['academic-asia.com']

export function guessDirection(from: EmailAddress | null): EmailDirection {
  const domain = from?.address.split('@')[1]?.toLowerCase() ?? ''
  return OWN_EMAIL_DOMAINS.some(d => domain === d || domain.endsWith(`.${d}`)) ? 'sent' : 'received'
}

export const DIRECTION_LABELS: Record<EmailDirection, string> = {
  received: 'Received',
  sent: 'Sent by us',
}

/** "Mrs Chan <mrs.chan@gmail.com>", or just the address or name when only one is known. */
export function formatAddress(a: EmailAddress): string {
  const name = a.name.replace(/[<>;"]/g, '').trim()
  if (name && a.address && name.toLowerCase() !== a.address.toLowerCase()) return `${name} <${a.address}>`
  return a.address || name
}

/** The editable text for a list of addresses, one per entry, separated by semicolons. */
export function formatAddressList(list: EmailAddress[]): string {
  return list.map(formatAddress).filter(Boolean).join('; ')
}

/** "Mrs Chan <mrs.chan@gmail.com>" → name and address; a bare address or a bare name also works. */
export function parseAddress(raw: string): EmailAddress | null {
  const text = raw.trim()
  if (!text) return null
  const angle = /^(.*?)<\s*([^<>\s]+)\s*>$/.exec(text)
  if (angle) return { name: angle[1].trim().replace(/^"|"$/g, '').trim(), address: angle[2].trim() }
  if (/^[^\s@]+@[^\s@]+$/.test(text)) return { name: '', address: text }
  return { name: text, address: '' }
}

/**
 * Splits the edited text on semicolons, new lines, and commas that follow a
 * complete address, so "Chan, Mrs <a@x.com>" stays one person.
 */
export function parseAddressList(raw: string): EmailAddress[] {
  return raw
    .split(/[;\n]|(?<=>)\s*,|(?<=@[^\s,;<>]+)\s*,/)
    .map(parseAddress)
    .filter((a): a is EmailAddress => a !== null)
}

/**
 * Value for an <input type="datetime-local"> in Hong Kong time. Hong Kong has
 * no daylight saving, so a fixed +08:00 offset is exact in both directions.
 */
export function toHkLocalInput(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return format(new TZDate(date, SCHEDULER_TIMEZONE), "yyyy-MM-dd'T'HH:mm")
}

/** The instant for a Hong Kong local "2026-10-27T09:15", or null when it is not a real date. */
export function fromHkLocalInput(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null
  const date = new Date(`${value}:00+08:00`)
  return Number.isNaN(date.getTime()) || toHkLocalInput(date.toISOString()) !== value ? null : date.toISOString()
}

/** "27/10/2026 09:15" in Hong Kong time (WEB-07: DD/MM/YYYY, 24-hour). */
export function formatEmailDate(iso: string): string {
  return format(new TZDate(new Date(iso), SCHEDULER_TIMEZONE), 'dd/MM/yyyy HH:mm')
}

/** "27/10/2026" in Hong Kong time, for list rows. */
export function formatEmailDay(iso: string): string {
  return format(new TZDate(new Date(iso), SCHEDULER_TIMEZONE), 'dd/MM/yyyy')
}
