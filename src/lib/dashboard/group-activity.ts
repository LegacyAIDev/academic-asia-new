import { describeActivity, entityName, type ActivityEntry } from '@/lib/activity/activity-format'

type Groupable = ActivityEntry & { subject: string | null }

/**
 * Folds runs of the same change (same person, record, action and kind) into one
 * line, so eight "Created application" rows read as four students, not a list
 * of repeats. The newest entry of each run stays, with how many it stands for.
 */
export function groupActivity<T extends Groupable>(entries: T[], max: number): (T & { count: number })[] {
  const groups: (T & { count: number })[] = []
  for (const entry of entries) {
    const last = groups.at(-1)
    if (last && last.subject === entry.subject && last.action === entry.action && last.entity === entry.entity && last.actorName === entry.actorName) {
      last.count += 1
      last.changed = [...new Set([...last.changed, ...entry.changed])]
    } else {
      if (groups.length === max) break
      groups.push({ ...entry, count: 1 })
    }
  }
  return groups
}

/** "Created 2 applications"; a run of edits lists every field it touched. */
export function describeGroup(entry: Groupable & { count: number }): string {
  if (entry.count === 1 || entry.action === 'updated') return describeActivity(entry)
  const verb = entry.action === 'created' ? 'Created' : 'Deleted'
  return `${verb} ${entry.count} ${entityName(entry.entity)}s`
}
