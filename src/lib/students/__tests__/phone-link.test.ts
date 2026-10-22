import { describe, it, expect } from 'vitest'
import { telHref } from '../phone-link'

describe('telHref', () => {
  it('dials the digits, keeping a leading plus', () => {
    expect(telHref('+852 9123 4567')).toBe('tel:+85291234567')
    expect(telHref('9123-4567')).toBe('tel:91234567')
    expect(telHref('(852) 2345 6789')).toBe('tel:85223456789')
  })
  it('leaves values that are not one callable number as text', () => {
    expect(telHref('N/A')).toBeNull()
    expect(telHref('-')).toBeNull()
    expect(telHref('2345 6789 / 9876 5432')).toBeNull()
    expect(telHref('2345 6789 ext 12')).toBeNull()
    expect(telHref('12 34')).toBeNull()
  })
})
