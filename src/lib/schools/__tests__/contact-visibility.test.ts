import { describe, it, expect } from 'vitest'
import { countInactive, visibleContacts } from '../contact-visibility'

const contacts = [
  { id: 'head', is_active: true },
  { id: 'former-registrar', is_active: false },
  { id: 'admissions', is_active: true },
  { id: 'former-bursar', is_active: false },
]

describe('visibleContacts', () => {
  it('lists only active contacts by default, in their original order', () => {
    expect(visibleContacts(contacts, false).map(c => c.id)).toEqual(['head', 'admissions'])
  })
  it('lists everyone when inactive contacts are asked for, still in the original order', () => {
    expect(visibleContacts(contacts, true).map(c => c.id)).toEqual(['head', 'former-registrar', 'admissions', 'former-bursar'])
  })
  it('lists nobody when every contact is inactive', () => {
    expect(visibleContacts(contacts.filter(c => !c.is_active), false)).toEqual([])
  })
  it('does not change the list it was given', () => {
    visibleContacts(contacts, false)
    expect(contacts).toHaveLength(4)
  })
})

describe('countInactive', () => {
  it('counts the contacts that are hidden by default', () => {
    expect(countInactive(contacts)).toBe(2)
    expect(countInactive(contacts.filter(c => c.is_active))).toBe(0)
    expect(countInactive([])).toBe(0)
  })
})
