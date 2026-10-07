import { describe, it, expect } from 'vitest'
import { colorForIndex, colorForType, PERSON_PALETTE, TYPE_COLORS } from '../colors'

describe('colorForType', () => {
  it('returns the mapped colour for a known booking type', () => {
    expect(colorForType('examination')).toBe(TYPE_COLORS.examination)
    expect(colorForType('internal_meeting')).toBe(TYPE_COLORS.internal_meeting)
  })

  it('falls back to the "other" colour for an unknown type', () => {
    expect(colorForType('not_a_real_type')).toBe(TYPE_COLORS.other)
  })
})

describe('colorForIndex', () => {
  it('returns the palette colour at the given index', () => {
    expect(colorForIndex(0)).toBe(PERSON_PALETTE[0])
    expect(colorForIndex(3)).toBe(PERSON_PALETTE[3])
  })

  it('wraps around when the index exceeds the palette length', () => {
    expect(colorForIndex(PERSON_PALETTE.length)).toBe(PERSON_PALETTE[0])
    expect(colorForIndex(PERSON_PALETTE.length + 2)).toBe(PERSON_PALETTE[2])
  })
})
