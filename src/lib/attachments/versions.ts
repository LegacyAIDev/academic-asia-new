/**
 * Version history of a replaced attachment (ASM-05). Each replaced row points
 * at the row that replaced it (`superseded_by`); the earlier versions of the
 * current file are found by walking those links backwards.
 */

export type VersionLink = { id: string; superseded_by: string | null }

/**
 * Earlier versions of `currentId`, newest first. Guards against loops and
 * branches (two rows claiming the same replacement): the first one found wins.
 */
export function earlierVersions<T extends VersionLink>(currentId: string, rows: T[]): T[] {
  const replacedBy = new Map<string, T>()
  for (const row of rows) {
    if (row.superseded_by && !replacedBy.has(row.superseded_by)) replacedBy.set(row.superseded_by, row)
  }
  const chain: T[] = []
  const seen = new Set([currentId])
  let next = replacedBy.get(currentId)
  while (next && !seen.has(next.id)) {
    chain.push(next)
    seen.add(next.id)
    next = replacedBy.get(next.id)
  }
  return chain
}

/** "Version 3" for a current file with two earlier versions. */
export function versionLabel(earlierCount: number): string {
  return `Version ${earlierCount + 1}`
}
