import { describe, it, expect } from 'vitest'
import { assessmentLabel } from '../booking-text-formatters'

describe('assessmentLabel', () => {
  it('returns a trimmed label', () => {
    expect(assessmentLabel({ label: '  English, Maths ' })).toBe('English, Maths')
  })
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a number', 42],
    ['a string', 'English'],
    ['an array', ['English']],
    ['an array of objects with a label', [{ label: 'English' }]],
    ['an object without a label', { name: 'English' }],
    ['a blank label', { label: '   ' }],
    ['a numeric label', { label: 7 }],
    ['a nested label', { label: { label: 'English' } }],
    ['a label one level down', { assessment: { label: 'English' } }],
  ])('returns null for %s', (_name, value) => {
    expect(assessmentLabel(value)).toBeNull()
  })
})
