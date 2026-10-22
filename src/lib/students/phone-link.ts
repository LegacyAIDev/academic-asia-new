/**
 * A tel: link for a number staff can call, or null when the field holds
 * something else ("N/A", two numbers with "/", an extension in words): those
 * are shown as written instead of dialling a wrong number. 203 family contacts
 * held such values on 2026-10-22.
 */
export function telHref(value: string): string | null {
  if (/[a-z/]/i.test(value)) return null
  const digits = value.replace(/\D/g, '')
  if (digits.length < 6) return null
  return `tel:${value.trim().startsWith('+') ? '+' : ''}${digits}`
}
