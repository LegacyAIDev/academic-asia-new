import { describe, it, expect } from 'vitest'
import { familyGroup, relationshipSeenFrom, siblingCodeFor } from '../family-relationships'
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
