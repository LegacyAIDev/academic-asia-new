import { dueStatus, type StaffTask } from '@/lib/tasks/task-rules'

/**
 * What the dashboard asks of the person signed in, most urgent first. Pure, so
 * the wording and order can be tested; the page supplies the counts it may see.
 */

export type AttentionTone = 'urgent' | 'due' | 'info'
export type AttentionItem = { key: string; count: number; label: string; detail: string; href: string; tone: AttentionTone }

export type AttentionInput = {
  /** Exams in the next 7 days not yet confirmed (the same window as the figures strip). Null without Scheduler access. */
  pendingExams: { count: number; earliestDate: string | null } | null
  tasks: StaffTask[] | null
  examsThisWeek: number | null
  today: string
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export function attentionItems({ pendingExams, tasks, examsThisWeek, today }: AttentionInput): AttentionItem[] {
  const items: AttentionItem[] = []
  const overdue = (tasks ?? []).filter(t => dueStatus(t.dueDate, today) === 'overdue')
  const dueToday = (tasks ?? []).filter(t => dueStatus(t.dueDate, today) === 'today')

  if (overdue.length) {
    items.push({ key: 'overdue', count: overdue.length, tone: 'urgent', href: '/tasks',
      label: `${plural(overdue.length, 'task')} past the deadline`, detail: overdue.slice(0, 2).map(t => t.title).join(', ') })
  }
  if (pendingExams && pendingExams.count > 0) {
    const from = pendingExams.earliestDate ? `&date=${pendingExams.earliestDate}` : ''
    items.push({ key: 'exams', count: pendingExams.count, tone: 'urgent',
      href: `/scheduler?view=rooms&mode=week&status=pending&types=examination,group_examination${from}`,
      label: `${plural(pendingExams.count, 'exam')} in the next 7 days waiting for confirmation`, detail: 'Confirm them so students and invigilators can be told.' })
  }
  if (dueToday.length) {
    items.push({ key: 'today', count: dueToday.length, tone: 'due', href: '/tasks',
      label: `${plural(dueToday.length, 'task')} due today`, detail: dueToday.slice(0, 2).map(t => t.title).join(', ') })
  }
  if (examsThisWeek) {
    items.push({ key: 'week', count: examsThisWeek, tone: 'info', href: '/exams',
      label: `${plural(examsThisWeek, 'exam')} in the next 7 days`, detail: 'Check papers and cover slips are ready on the exam desk.' })
  }
  return items
}

/** "Good morning" before noon, "Good afternoon" until 6pm, then "Good evening", in Hong Kong time. */
export function greeting(now: Date = new Date()): string {
  const hour = (now.getUTCHours() + 8) % 24
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
