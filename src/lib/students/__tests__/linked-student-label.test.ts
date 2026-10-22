import { describe, it, expect } from 'vitest'
import { linkedStudentDetails, linkedStudentName } from '../linked-student-label'

describe('linkedStudentName', () => {
  it('adds the Chinese name when there is one', () => {
    expect(linkedStudentName({ first_name: 'Edward', surname: 'CHAN', chinese_name: '陳大文' })).toBe('Edward CHAN 陳大文')
    expect(linkedStudentName({ first_name: 'Edward', surname: 'CHAN', chinese_name: null })).toBe('Edward CHAN')
  })
})

describe('linkedStudentDetails', () => {
  it('lists code, birth date and current school, skipping what is missing', () => {
    expect(linkedStudentDetails({ student_code: 'S046020', date_of_birth: '2010-03-04', present_school: 'LA SALLE COLLEGE' }))
      .toBe('S046020 · born 4 Mar 2010 · LA SALLE COLLEGE')
    expect(linkedStudentDetails({ student_code: 'S046020', date_of_birth: null, present_school: null })).toBe('S046020')
    expect(linkedStudentDetails({ student_code: null, date_of_birth: null, present_school: null })).toBe('')
  })
})
