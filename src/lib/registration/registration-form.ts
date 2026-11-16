import { createHash, randomBytes } from 'node:crypto'

export { LINK_DAYS } from './registration-days'

/** A new link's secret: 32 random bytes, safe in a URL. */
export function newRegistrationToken(): string {
  return randomBytes(32).toString('base64url')
}

/** Only this is stored, so the table never holds a usable link. */
export function hashRegistrationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** A plausible link secret, checked before touching the database. */
export function looksLikeToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{40,60}$/.test(token)
}

export type ParentInput = { name: string; mobile: string; email: string }

export type RegistrationInput = {
  first_name: string
  surname: string
  chinese_name: string
  gender: string
  date_of_birth: string
  email: string
  mobile: string
  present_school: string
  entry_year: string
  mother: ParentInput
  father: ParentInput
  notes: string
  consent: boolean
}

export type CleanRegistration = {
  student: {
    first_name: string; surname: string; chinese_name: string | null; gender: 'M' | 'F' | null
    date_of_birth: string | null; email: string | null; mobile: string | null
    present_school: string | null; entry_year: number | null
  }
  parents: { relationship: 'mother' | 'father'; first_name: string | null; surname: string | null; mobile: string | null; email_1: string | null }[]
  notes: string | null
}

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '')
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

/** Splits "Mei Ling Chan" into first names and surname; one word is a first name. */
export function splitName(name: string): { first_name: string | null; surname: string | null } {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return { first_name: null, surname: null }
  if (words.length === 1) return { first_name: words[0], surname: null }
  return { first_name: words.slice(0, -1).join(' '), surname: words[words.length - 1] }
}

/**
 * Checks what a family typed, field by field, and returns either the record to
 * save or the problems to show next to the fields. Nothing is trusted from the
 * browser: lengths are capped and formats checked here.
 */
export function checkRegistration(raw: Partial<RegistrationInput>, today = new Date()):
  { ok: true; data: CleanRegistration } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  const first = text(raw.first_name, 80)
  const surname = text(raw.surname, 80)
  if (!first) errors.first_name = 'Enter the student\'s first name'
  if (!surname) errors.surname = 'Enter the student\'s surname'

  const dob = text(raw.date_of_birth, 10)
  if (dob && (!DATE.test(dob) || Number.isNaN(Date.parse(dob)) || dob > today.toISOString().slice(0, 10))) {
    errors.date_of_birth = 'Enter a real date of birth'
  }
  const email = text(raw.email, 120)
  if (email && !EMAIL.test(email)) errors.email = 'Enter a valid email address'

  const year = text(raw.entry_year, 4)
  const entryYear = year ? Number(year) : null
  if (year && (!Number.isInteger(entryYear) || entryYear! < today.getFullYear() || entryYear! > today.getFullYear() + 15)) {
    errors.entry_year = 'Choose the year the student hopes to start'
  }

  const parents: CleanRegistration['parents'] = []
  for (const relationship of ['mother', 'father'] as const) {
    const p = raw[relationship] ?? { name: '', mobile: '', email: '' }
    const name = text(p.name, 120)
    const mobile = text(p.mobile, 40)
    const parentEmail = text(p.email, 120)
    if (parentEmail && !EMAIL.test(parentEmail)) errors[`${relationship}.email`] = 'Enter a valid email address'
    if (name || mobile || parentEmail) parents.push({ relationship, ...splitName(name), mobile: mobile || null, email_1: parentEmail || null })
  }
  if (!parents.some(p => p.mobile || p.email_1)) errors.parents = 'Give at least one parent\'s mobile or email, so we can reach you'
  if (raw.consent !== true) errors.consent = 'Please agree so we can keep these details'

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  const gender = raw.gender === 'M' || raw.gender === 'F' ? raw.gender : null
  return {
    ok: true,
    data: {
      student: {
        first_name: first, surname: surname.toUpperCase(), chinese_name: text(raw.chinese_name, 40) || null, gender,
        date_of_birth: dob || null, email: email || null, mobile: text(raw.mobile, 40) || null,
        present_school: text(raw.present_school, 160) || null, entry_year: entryYear,
      },
      parents,
      notes: text(raw.notes, 2000) || null,
    },
  }
}
