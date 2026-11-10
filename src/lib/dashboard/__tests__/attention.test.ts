import { describe, expect, it } from 'vitest'
import { attentionItems, greeting } from '../attention'
import type { StaffTask } from '@/lib/tasks/task-rules'

const task = (title: string, dueDate: string | null): StaffTask => ({ id: title, title, notes: null, priority: 'medium', dueDate, completedAt: null, createdAt: '2026-11-01T00:00:00Z' })
const today = '2026-11-11'

describe('attentionItems', () => {
  it('lists overdue tasks, exams to confirm, tasks due today and the week ahead, most urgent first', () => {
    const items = attentionItems({
      pendingExams: { count: 9, earliestDate: '2026-11-12' },
      tasks: [task('Call the Chans', '2026-11-09'), task('Send fee schedule', today), task('Later thing', '2026-12-01')],
      examsThisWeek: 4,
      today,
    })
    expect(items.map(i => [i.key, i.label])).toEqual([
      ['overdue', '1 task past the deadline'],
      ['exams', '9 exams waiting for confirmation'],
      ['today', '1 task due today'],
      ['week', '4 exams in the next 7 days'],
    ])
    expect(items[0].detail).toBe('Call the Chans')
    expect(items[1].href).toContain('date=2026-11-12')
  })

  it('leaves out what the person cannot see and what is at zero', () => {
    expect(attentionItems({ pendingExams: null, tasks: [], examsThisWeek: null, today })).toEqual([])
    expect(attentionItems({ pendingExams: { count: 0, earliestDate: null }, tasks: null, examsThisWeek: 0, today })).toEqual([])
  })
})

describe('greeting', () => {
  it('follows the time of day in Hong Kong', () => {
    expect(greeting(new Date('2026-11-11T01:00:00Z'))).toBe('Good morning')
    expect(greeting(new Date('2026-11-11T06:00:00Z'))).toBe('Good afternoon')
    expect(greeting(new Date('2026-11-11T12:00:00Z'))).toBe('Good evening')
  })
})
