import { describe, it, expect } from 'vitest'
import { familyGroup, groupFamily, relationshipSeenFrom, siblingCodeFor } from '../family-relationships'
import { studentSearchFilter, studentSearchWords } from '../student-search'

describe('familyGroup', () => {
  it('puts parents and guardians first, then brothers and sisters, then everyone else', () => {
    expect(['mother', 'father', 'guardian'].map(familyGroup)).toEqual(['parents', 'parents', 'parents'])
    expect(['brother', 'sister'].map(familyGroup)).toEqual(['siblings', 'siblings'])
    expect(['uncle', 'auntie', 'cousin', 'friend', 'other', null, undefined].map(familyGroup))
      .toEqual(['others', 'others', 'others', 'others', 'others', 'others', 'others'])
  })
})

describe('relationshipSeenFrom', () => {
  it('turns a brother or sister round by the other student\'s gender', () => {
    expect(relationshipSeenFrom('brother', 'F')).toEqual({ group: 'siblings', label: 'Sister' })
    expect(relationshipSeenFrom('sister', 'M')).toEqual({ group: 'siblings', label: 'Brother' })
    expect(relationshipSeenFrom('brother', null)).toEqual({ group: 'siblings', label: 'Sibling' })
  })
  it('keeps cousins and friends, and calls anything else family', () => {
    expect(relationshipSeenFrom('cousin', 'M')).toEqual({ group: 'others', label: 'Cousin' })
    expect(relationshipSeenFrom('friend', 'F')).toEqual({ group: 'others', label: 'Friend' })
    expect(relationshipSeenFrom('uncle', 'M')).toEqual({ group: 'others', label: 'Family' })
    expect(relationshipSeenFrom(null, 'M')).toEqual({ group: 'others', label: 'Family' })
  })
})

describe('groupFamily', () => {
  const contact = (id: string, code: string | null, related: string | null = null) =>
    ({ id, relationship: code ? { code } : null, related_student_id: related })
  const link = (id: string, code: string | null, gender: string | null) =>
    ({ contactId: `l-${id}`, relationshipCode: code, student: { id, gender } })

  it('sorts contacts into parents, brothers and sisters, and everyone else', () => {
    const groups = groupFamily([contact('m', 'mother'), contact('b', 'brother', 's2'), contact('u', 'uncle'), contact('x', null)], [])
    expect(groups.parents.map((e) => e.kind === 'contact' && e.contact.id)).toEqual(['m'])
    expect(groups.siblings.map((e) => e.kind === 'contact' && e.contact.id)).toEqual(['b'])
    expect(groups.others.map((e) => e.kind === 'contact' && e.contact.id)).toEqual(['u', 'x'])
  })

  it('adds links from other students with the relationship turned round', () => {
    const groups = groupFamily([], [link('s3', 'brother', 'F'), link('s4', 'cousin', 'M'), link('s5', 'uncle', 'M')])
    expect(groups.siblings).toEqual([{ kind: 'link', link: link('s3', 'brother', 'F'), label: 'Sister' }])
    expect(groups.others.map((e) => e.kind === 'link' && e.label)).toEqual(['Cousin', 'Family'])
  })

  it('shows a student once when both students linked each other', () => {
    const groups = groupFamily([contact('b', 'brother', 's2')], [link('s2', 'sister', 'M')])
    expect(groups.siblings).toHaveLength(1)
    expect(groups.siblings[0].kind).toBe('contact')
  })

  it('keeps the order it was given and drops a double link in any group', () => {
    const groups = groupFamily(
      [contact('f', 'father'), contact('m', 'mother'), contact('c', 'cousin', 's4')],
      [link('s4', 'cousin', 'M'), link('s5', 'friend', 'F')],
    )
    expect(groups.parents.map((e) => e.kind === 'contact' && e.contact.id)).toEqual(['f', 'm'])
    expect(groups.others.map((e) => (e.kind === 'contact' ? e.contact.id : e.label))).toEqual(['c', 'Friend'])
  })
})

describe('siblingCodeFor', () => {
  it('offers brother or sister by gender, nothing when unknown', () => {
    expect(siblingCodeFor('M')).toBe('brother')
    expect(siblingCodeFor('F')).toBe('sister')
    expect(siblingCodeFor(null)).toBeNull()
  })
})

describe('studentSearchWords', () => {
  it('splits the query into words in any order', () => {
    expect(studentSearchWords('  chan  tai man ')).toEqual(['chan', 'tai', 'man'])
  })
  it('drops characters the filter syntax cannot carry and keeps at most four words', () => {
    expect(studentSearchWords('o\'brien, (jr.) "x"')).toEqual(['o', 'brien', 'jr', 'x'])
    expect(studentSearchWords('%*:\\')).toEqual([])
    expect(studentSearchWords('a b c d e')).toEqual(['a', 'b', 'c', 'd'])
  })
  it('keeps Chinese names and student codes whole', () => {
    expect(studentSearchWords('陳大文 S046020')).toEqual(['陳大文', 'S046020'])
  })
})

describe('studentSearchFilter', () => {
  it('matches one word anywhere in the names or the code', () => {
    expect(studentSearchFilter('chan'))
      .toBe('surname.ilike.%chan%,first_name.ilike.%chan%,chinese_name.ilike.%chan%,student_code.ilike.%chan%')
  })
})
