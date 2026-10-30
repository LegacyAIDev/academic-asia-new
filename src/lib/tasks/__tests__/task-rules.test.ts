import { describe, it, expect } from 'vitest'
import {
  dueLabel, dueStatus, hkToday, sortActiveTasks, sortCompletedTasks, taskColumns, taskInputSchema, toStaffTask, type StaffTask,
} from '../task-rules'

const task = (over: Partial<StaffTask>): StaffTask => ({
  id: 'x', title: 't', notes: null, priority: 'medium', dueDate: null, completedAt: null, createdAt: '2026-10-01T00:00:00Z', ...over,
})

describe('taskInputSchema', () => {
  it('needs a title, keeps a real deadline and defaults to medium priority', () => {
    expect(taskInputSchema.parse({ title: '  Chase offer  ' })).toEqual({ title: 'Chase offer', notes: '', priority: 'medium', dueDate: '' })
    expect(taskInputSchema.safeParse({ title: ' ' }).error?.issues[0].message).toBe('Write the task first')
    expect(taskInputSchema.safeParse({ title: 'a', dueDate: '2026-02-30' }).error?.issues[0].message).toBe('Choose a real date')
    expect(taskInputSchema.safeParse({ title: 'a', priority: 'urgent' }).success).toBe(false)
    expect(taskColumns(taskInputSchema.parse({ title: 'a', dueDate: '2026-11-02', priority: 'high' })))
      .toEqual({ title: 'a', notes: null, priority: 'high', due_date: '2026-11-02' })
  })
})

describe('deadlines', () => {
  it('uses the Hong Kong calendar day', () => {
    expect(hkToday(new Date('2026-10-30T15:59:00Z'))).toBe('2026-10-30')
    expect(hkToday(new Date('2026-10-30T16:00:00Z'))).toBe('2026-10-31')
  })

  it('says where a deadline stands and words it for the list (WEB-07)', () => {
    const today = '2026-10-30'
    expect(dueStatus('2026-10-29', today)).toBe('overdue')
    expect(dueStatus('2026-10-30', today)).toBe('today')
    expect(dueStatus('2026-11-06', today)).toBe('soon')
    expect(dueStatus('2026-11-07', today)).toBe('later')
    expect(dueStatus(null, today)).toBe('none')
    expect(dueLabel('2026-10-29', today)).toBe('Overdue · 29/10/2026')
    expect(dueLabel('2026-10-30', today)).toBe('Today')
    expect(dueLabel('2026-10-31', today)).toBe('Tomorrow')
    expect(dueLabel('2026-12-25', today)).toBe('25/12/2026')
    expect(dueLabel(null, today)).toBe('No deadline')
  })
})

describe('ordering', () => {
  it('puts deadlines first (earliest first), then priority, then oldest', () => {
    const list = [
      task({ id: 'none-low', priority: 'low' }),
      task({ id: 'later', dueDate: '2026-12-01' }),
      task({ id: 'none-high', priority: 'high', createdAt: '2026-10-05T00:00:00Z' }),
      task({ id: 'overdue', dueDate: '2026-10-01' }),
      task({ id: 'none-high-older', priority: 'high', createdAt: '2026-10-02T00:00:00Z' }),
      task({ id: 'later-high', dueDate: '2026-12-01', priority: 'high' }),
    ]
    expect(sortActiveTasks(list).map(t => t.id)).toEqual(['overdue', 'later-high', 'later', 'none-high-older', 'none-high', 'none-low'])
  })

  it('shows the most recently completed first', () => {
    const list = [task({ id: 'a', completedAt: '2026-10-01T00:00:00Z' }), task({ id: 'b', completedAt: '2026-10-03T00:00:00Z' })]
    expect(sortCompletedTasks(list).map(t => t.id)).toEqual(['b', 'a'])
  })

  it('reads an unknown stored priority as medium', () => {
    expect(toStaffTask({ id: 'i', title: 't', notes: null, priority: 'odd', due_date: null, completed_at: null, created_at: 'c' }).priority).toBe('medium')
  })
})
