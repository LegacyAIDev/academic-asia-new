import { describe, it, expect } from 'vitest'
import { personName } from '../person-name'

describe('personName', () => {
  it('joins first name and surname', () => {
    expect(personName({ first_name: 'Ada', surname: 'Lovelace' })).toBe('Ada Lovelace')
  })

  it('drops a missing part without leaving stray spaces', () => {
    expect(personName({ first_name: 'Ada', surname: null })).toBe('Ada')
    expect(personName({ first_name: null, surname: 'Lovelace' })).toBe('Lovelace')
  })

  it('is empty when nothing is known', () => {
    expect(personName({ first_name: null, surname: null })).toBe('')
    expect(personName(null)).toBe('')
    expect(personName(undefined)).toBe('')
  })
})
