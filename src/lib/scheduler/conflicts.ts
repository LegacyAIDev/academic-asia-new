/**
 * Pure helpers for soft conflict detection. Room capacity and seat clashes are
 * hard rules enforced by the database; these functions only decide which
 * people are already busy so the dialog can warn before saving.
 */

export type BusySubjectKind = 'room' | 'profile' | 'student'

export type BusyInterval = {
  subjectKind: BusySubjectKind
  subjectId: string
  itemSource: string
  itemId: string
  title: string
  bookingType: string
  startAt: string
  endAt: string
}

export type ConflictSummary = {
  people: BusyInterval[]
  rooms: BusyInterval[]
}

/** True when two half-open [start, end) intervals share any time. */
export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd)
}

/** Splits busy intervals that overlap the candidate into people and rooms, one entry per item. */
export function findConflicts(
  candidate: { startAt: string; endAt: string },
  busy: BusyInterval[],
): ConflictSummary {
  const seen = new Set<string>()
  const people: BusyInterval[] = []
  const rooms: BusyInterval[] = []

  for (const interval of busy) {
    if (!overlaps(candidate.startAt, candidate.endAt, interval.startAt, interval.endAt)) continue
    const key = `${interval.subjectKind}:${interval.subjectId}:${interval.itemId}`
    if (seen.has(key)) continue
    seen.add(key)
    if (interval.subjectKind === 'room') rooms.push(interval)
    else people.push(interval)
  }

  return { people, rooms }
}
