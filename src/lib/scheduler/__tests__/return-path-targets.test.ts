import { describe, it, expect } from 'vitest'
import { returnLabel, safeReturnPath } from '../return-path'

const FALLBACK = '/scheduler'
const STUDENT = '11111111-1111-4111-8111-111111111111'

describe('safeReturnPath - exams and student pages', () => {
  it.each(['/exams', '/exams?status=1&page=2', `/students/${STUDENT}`, `/students/${STUDENT}?tab=calendar`])(
    'accepts %s',
    path => {
      expect(safeReturnPath(path, FALLBACK)).toBe(path)
    },
  )

  it.each([
    '/students',
    '/students/not-a-uuid',
    `/students/${STUDENT}/edit`,
    '/examsx',
    '/exams/123',
    '//evil.com',
    'https://evil.com/exams',
    '/exams?next=https://evil.com',
  ])('rejects %s', path => {
    expect(safeReturnPath(path, FALLBACK)).toBe(FALLBACK)
  })
})

describe('returnLabel', () => {
  it.each([
    ['/scheduler?view=team', 'Back to calendar'],
    ['/exams?page=2', 'Back to exams'],
    [`/students/${STUDENT}?tab=calendar`, 'Back to student'],
    ['/somewhere-else', 'Back to calendar'],
  ])('%s -> %s', (path, label) => {
    expect(returnLabel(path)).toBe(label)
  })
})
