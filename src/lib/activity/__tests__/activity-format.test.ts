import { describe, it, expect } from 'vitest'
import { describeActivity, entityName, fieldName, hiddenActivityKinds, toActivityEntry } from '../activity-format'

describe('activity wording', () => {
  it('names records and fields the way staff would', () => {
    expect(entityName('student_individual_exams')).toBe('exam')
    expect(entityName('scheduler_bookings')).toBe('booking')
    expect(entityName('mystery_things')).toBe('mystery thing')
    expect(fieldName('status_id')).toBe('status')
    expect(fieldName('preferred_start_time')).toBe('preferred start time')
    expect(fieldName('department_id')).toBe('department')
  })

  it('describes created, deleted and updated records, with what changed', () => {
    expect(describeActivity({ action: 'created', entity: 'filed_emails', changed: [] })).toBe('Created email')
    expect(describeActivity({ action: 'deleted', entity: 'student_contacts', changed: [] })).toBe('Deleted family member')
    expect(describeActivity({ action: 'updated', entity: 'student_applications', changed: ['status_id', 'sub_status_id'] }))
      .toBe('Updated application: status, sub-status')
    // archived_at and archived_by both read "archived": said once.
    expect(describeActivity({ action: 'updated', entity: 'filed_emails', changed: ['archived_at', 'archived_by'] }))
      .toBe('Updated email: archived')
    expect(describeActivity({ action: 'updated', entity: 'students', changed: ['a', 'b', 'c', 'd', 'e', 'f'] }))
      .toBe('Updated student record: a, b, c, d and 2 more')
  })

  it('shows who did it: a person, a removed account, or the system', () => {
    const row = { id: 1, occurred_at: 't', action: 'updated', entity: 'students', label: 'Lucas Ng', changed: null }
    expect(toActivityEntry({ ...row, actor_id: 'p', actor: { first_name: 'Sam', surname: 'Staff' } }).actorName).toBe('Sam Staff')
    expect(toActivityEntry({ ...row, actor_id: 'p', actor: null }).actorName).toBe('Former staff')
    expect(toActivityEntry({ ...row, actor_id: null, actor: null })).toMatchObject({ actorName: 'System', changed: [] })
  })
})

describe('hiddenActivityKinds', () => {
  it('hides exam papers outside the exam team and bookings without the Scheduler', () => {
    expect(hiddenActivityKinds({ examPapers: true, scheduler: true })).toEqual([])
    expect(hiddenActivityKinds({ examPapers: false, scheduler: true })).toEqual(['school_exam_papers'])
    expect(hiddenActivityKinds({ examPapers: true, scheduler: false })).toEqual(['scheduler_bookings', 'scheduler_booking_attendees'])
  })
})
