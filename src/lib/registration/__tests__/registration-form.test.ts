import { describe, expect, it } from 'vitest'
import { checkRegistration, hashRegistrationToken, looksLikeToken, newRegistrationToken, splitName } from '../registration-form'

const today = new Date('2026-11-16')
const valid = {
  first_name: ' Amy ', surname: 'chan', gender: 'F', date_of_birth: '2014-03-02', email: '', mobile: '',
  chinese_name: '', present_school: 'St Paul\'s', entry_year: '2028', notes: '',
  mother: { name: 'Mei Ling Chan', mobile: '9123 4567', email: '' }, father: { name: '', mobile: '', email: '' }, consent: true,
}

describe('online registration', () => {
  it('makes long random links and stores only their hash', () => {
    const token = newRegistrationToken()
    expect(looksLikeToken(token)).toBe(true)
    expect(newRegistrationToken()).not.toBe(token)
    expect(hashRegistrationToken(token)).toMatch(/^[0-9a-f]{64}$/)
    expect(looksLikeToken('short')).toBe(false)
    expect(looksLikeToken('a'.repeat(43) + '/')).toBe(false)
  })

  it('accepts a complete form, tidied', () => {
    const result = checkRegistration(valid, today)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.student).toMatchObject({ first_name: 'Amy', surname: 'CHAN', gender: 'F', entry_year: 2028, present_school: 'St Paul\'s' })
    expect(result.data.parents).toEqual([{ relationship: 'mother', first_name: 'Mei Ling', surname: 'Chan', mobile: '9123 4567', email_1: null }])
  })

  it('names every problem', () => {
    const result = checkRegistration({ ...valid, first_name: '', date_of_birth: '2030-01-01', email: 'nope', entry_year: '2020',
      mother: { name: 'Mei', mobile: '', email: 'bad' }, consent: false }, today)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(Object.keys(result.errors).sort()).toEqual(['consent', 'date_of_birth', 'email', 'entry_year', 'first_name', 'mother.email'])
  })

  it('asks for a way to reach a parent', () => {
    const result = checkRegistration({ ...valid, mother: { name: 'Mei', mobile: '', email: '' } }, today)
    expect(result.ok === false && result.errors.parents).toBeTruthy()
  })

  it('splits a parent\'s name into first names and surname', () => {
    expect(splitName('Tom')).toEqual({ first_name: 'Tom', surname: null })
    expect(splitName(' Chan  Tai Man ')).toEqual({ first_name: 'Chan Tai', surname: 'Man' })
  })
})
