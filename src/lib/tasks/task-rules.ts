import { z } from 'zod'

/**
 * Rules of the task planner (meeting note 2): a simple personal to-do list.
 * Pure, so the page, the actions and the tests share one definition.
 */

export const TASK_PRIORITIES = ['high', 'medium', 'low'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const PRIORITY_LABELS: Record<TaskPriority, string> = { high: 'High', medium: 'Medium', low: 'Low' }

export type StaffTask = {
  id: string
  title: string
  notes: string | null
  priority: TaskPriority
  /** "YYYY-MM-DD", a Hong Kong calendar day, or null for no deadline. */
  dueDate: string | null
  completedAt: string | null
  createdAt: string
}

const isDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`))
  && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v

export const taskInputSchema = z.object({
  title: z.string().trim().min(1, 'Write the task first').max(200, 'Up to 200 characters'),
  notes: z.string().trim().max(2000, 'Notes can be up to 2,000 characters').default(''),
  priority: z.enum(TASK_PRIORITIES, { errorMap: () => ({ message: 'Choose a priority' }) }).default('medium'),
  dueDate: z.string().default('').refine(v => v === '' || isDay(v), 'Choose a real date'),
})

export type TaskInput = z.input<typeof taskInputSchema>

export function taskColumns(input: z.output<typeof taskInputSchema>) {
  return { title: input.title, notes: input.notes || null, priority: input.priority, due_date: input.dueDate || null }
}

export { hkToday } from '@/lib/hk-day'

export type DueStatus = 'overdue' | 'today' | 'soon' | 'later' | 'none'

/** Where a deadline stands against today: soon means within the next 7 days. */
export function dueStatus(dueDate: string | null, today: string): DueStatus {
  if (!dueDate) return 'none'
  if (dueDate < today) return 'overdue'
  if (dueDate === today) return 'today'
  const days = (Date.parse(`${dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000
  return days <= 7 ? 'soon' : 'later'
}

/** "Today", "Tomorrow", "Overdue · 28/10/2026" or "30/10/2026" (WEB-07: DD/MM/YYYY). */
export function dueLabel(dueDate: string | null, today: string): string {
  if (!dueDate) return 'No deadline'
  const [y, m, d] = dueDate.split('-')
  const day = `${d}/${m}/${y}`
  const status = dueStatus(dueDate, today)
  if (status === 'overdue') return `Overdue · ${day}`
  if (status === 'today') return 'Today'
  const tomorrow = new Date(Date.parse(`${today}T00:00:00Z`) + 86400000).toISOString().slice(0, 10)
  return dueDate === tomorrow ? 'Tomorrow' : day
}

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 }

/**
 * Active list order: tasks with a deadline first, earliest (so overdue) first,
 * then by priority, then oldest first so new tasks do not jump the queue.
 */
export function sortActiveTasks(tasks: StaffTask[]): StaffTask[] {
  return [...tasks].sort((a, b) => {
    if (a.dueDate !== b.dueDate) {
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate < b.dueDate ? -1 : 1
    }
    return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.createdAt.localeCompare(b.createdAt)
  })
}

/** Completed list: most recently completed first. */
export function sortCompletedTasks(tasks: StaffTask[]): StaffTask[] {
  return [...tasks].sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
}

export type TaskRow = {
  id: string; title: string; notes: string | null; priority: string; due_date: string | null
  completed_at: string | null; created_at: string
}

export const TASK_SELECT = 'id, title, notes, priority, due_date, completed_at, created_at'

export function toStaffTask(row: TaskRow): StaffTask {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    priority: (TASK_PRIORITIES as readonly string[]).includes(row.priority) ? (row.priority as TaskPriority) : 'medium',
    dueDate: row.due_date,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  }
}
