import { describe, expect, it } from 'vitest'
import { combineParents, fillBlanks, parentMerges, sameParent } from '../shared-parents'

const parent = (id: string, code: string, extra: Record<string, string | null> = {}) => ({
  id, relationship: { code }, first_name: null, surname: null, mobile: null, telephone: null, email_1: null, created_at: '2026-01-01', ...extra,
})

describe('shared parents', () => {
  it('recognises the same parent by email, phone or name, within one relationship', () => {
    expect(sameParent(parent('a', 'mother', { email_1: 'Mei@Example.com ' }), parent('b', 'mother', { email_1: 'mei@example.com' }))).toBe(true)
    expect(sameParent(parent('a', 'mother', { mobile: '+852 9123 4567' }), parent('b', 'mother', { telephone: '91234567' }))).toBe(true)
    expect(sameParent(parent('a', 'father', { first_name: 'Tom', surname: 'Ng' }), parent('b', 'father', { first_name: 'tom', surname: 'NG' }))).toBe(true)
    expect(sameParent(parent('a', 'mother', { email_1: 'x@y.com' }), parent('b', 'father', { email_1: 'x@y.com' }))).toBe(false)
    expect(sameParent(parent('a', 'mother', { mobile: '1234' }), parent('b', 'mother', { mobile: '1234' }))).toBe(false)
    expect(sameParent(parent('a', 'mother'), parent('b', 'mother'))).toBe(false)
  })

  it('shows a sibling\'s parents unless they are already the student\'s own', () => {
    const own = [parent('m1', 'mother', { email_1: 'mei@x.com' })]
    const sibling = [parent('m2', 'mother', { email_1: 'mei@x.com' }), parent('f2', 'father', { first_name: 'Tom' })]
    const { shared } = combineParents(own, sibling)
    expect(shared.map(p => p.id)).toEqual(['f2'])
  })

  it('shows a parent shared by two siblings once', () => {
    const fromSiblings = [parent('f1', 'father', { first_name: 'Tom', surname: 'Ng' }), parent('f1', 'father', { first_name: 'Tom', surname: 'Ng' })]
    expect(combineParents([], fromSiblings).shared.map(p => p.id)).toEqual(['f1'])
  })

  it('keeps the older record when merging, and fills its blanks from the other', () => {
    const older = parent('a', 'mother', { email_1: 'mei@x.com', created_at: '2025-01-01' })
    const newer = parent('b', 'mother', { email_1: 'mei@x.com', mobile: '91234567', created_at: '2026-01-01' })
    const [merge] = parentMerges([newer], [older])
    expect(merge.keep.id).toBe('a')
    expect(merge.drop.id).toBe('b')
    expect(fillBlanks(merge.keep, merge.drop, ['mobile', 'email_1'])).toEqual({ mobile: '91234567' })
    expect(parentMerges([parent('a', 'mother', { email_1: 'a@x.com' })], [parent('b', 'mother', { email_1: 'b@x.com' })])).toEqual([])
  })
})
