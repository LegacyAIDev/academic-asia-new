import { describe, expect, it } from 'vitest'
import { missingRequired, type RequiredRule } from '../required-fields'

type Contact = { first_name?: string | null; surname?: string | null; email_1?: string | null; relationship_id?: number | null }
const rules: RequiredRule<Contact>[] = [
  { anyOf: ['relationship_id'], message: 'Choose the relationship' },
  { anyOf: ['first_name', 'surname', 'email_1'], message: 'Enter a name or an email' },
]

describe('missingRequired', () => {
  it('reports the first rule an untouched form breaks', () => {
    expect(missingRequired({ first_name: null, surname: '', email_1: '   ', relationship_id: null }, rules)).toBe('Choose the relationship')
  })

  it('treats blank and whitespace strings as empty', () => {
    expect(missingRequired({ relationship_id: 1, first_name: '  ', surname: '' }, rules)).toBe('Enter a name or an email')
  })

  it('passes when each rule has one filled field', () => {
    expect(missingRequired({ relationship_id: 1, email_1: 'a@b.hk' }, rules)).toBeNull()
    expect(missingRequired({ relationship_id: 0, surname: 'Chan' }, rules)).toBeNull()
  })
})
