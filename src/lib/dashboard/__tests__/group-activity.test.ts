import { describe, expect, it } from 'vitest'
import { describeGroup, groupActivity } from '../group-activity'

const entry = (id: number, over: Partial<Parameters<typeof groupActivity>[0][number]> = {}) => ({
  id, occurredAt: '2026-11-11T01:00:00Z', actorName: 'System', action: 'created' as const,
  entity: 'student_applications', label: null, changed: [], subject: 'Vincent AU', ...over,
})

describe('groupActivity', () => {
  it('folds a run of the same change on one record into one line', () => {
    const groups = groupActivity([entry(1), entry(2), entry(3, { subject: 'Tiffany SHUM' })], 6)
    expect(groups.map(g => [g.id, g.count])).toEqual([[1, 2], [3, 1]])
    expect(describeGroup(groups[0])).toBe('Created 2 applications')
  })

  it('keeps different actions, people and records apart and stops at the limit', () => {
    const groups = groupActivity([entry(1), entry(2, { action: 'updated' }), entry(3, { actorName: 'Ada' }), entry(4, { subject: 'X' })], 3)
    expect(groups.map(g => g.id)).toEqual([1, 2, 3])
  })

  it('lists every field a run of edits touched', () => {
    const [group] = groupActivity([entry(1, { action: 'updated', changed: ['status_id'] }), entry(2, { action: 'updated', changed: ['notes'] })], 6)
    expect(describeGroup(group)).toContain('notes')
    expect(group.count).toBe(2)
  })
})
