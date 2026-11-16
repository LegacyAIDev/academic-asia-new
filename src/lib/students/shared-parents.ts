/**
 * Brothers and sisters share their parents: a student's Parents and guardians
 * are their own plus those recorded on the siblings they are linked to. The
 * same parent recorded on two children (as before sharing existed) is one
 * person, recognised by relationship plus a matching email, mobile or name.
 */

export const PARENT_CODES = new Set(['mother', 'father', 'guardian'])
export const SIBLING_CODES = new Set(['brother', 'sister'])

type ParentLike = {
  id: string
  relationship: { code: string } | null
  first_name: string | null
  surname: string | null
  mobile: string | null
  telephone: string | null
  email_1: string | null
  created_at?: string | null
}

const digits = (value: string | null | undefined) => (value ?? '').replace(/\D/g, '')
const lower = (value: string | null | undefined) => (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')

/** Whether two parent records describe the same person. */
export function sameParent(a: ParentLike, b: ParentLike): boolean {
  if (!a.relationship || a.relationship.code !== b.relationship?.code) return false
  const email = lower(a.email_1)
  if (email && email === lower(b.email_1)) return true
  // Phone numbers are compared on their last 8 digits, so "+852 9123 4567" matches "91234567".
  for (const x of [digits(a.mobile), digits(a.telephone)]) {
    if (x.length < 8) continue
    for (const y of [digits(b.mobile), digits(b.telephone)]) if (y.length >= 8 && x.slice(-8) === y.slice(-8)) return true
  }
  const name = lower(`${a.first_name ?? ''} ${a.surname ?? ''}`)
  return name.length > 1 && name === lower(`${b.first_name ?? ''} ${b.surname ?? ''}`)
}

/**
 * The parents to show for a student: their own first, then each sibling's
 * parent who is not already among them (a sibling's duplicate of the same
 * person is left out rather than shown twice).
 */
export function combineParents<P extends ParentLike, S extends ParentLike>(own: P[], fromSiblings: S[]): { own: P[]; shared: S[] } {
  const shown: ParentLike[] = [...own]
  const shared: S[] = []
  for (const parent of fromSiblings) {
    if (shown.some(existing => existing.id === parent.id || sameParent(existing, parent))) continue
    shown.push(parent)
    shared.push(parent)
  }
  return { own, shared }
}

/**
 * When two siblings both hold the same parent, which record stays (the older
 * one) and which is folded into it. Different people with the same relationship
 * (a parent and a step-parent, say) are left as they are.
 */
export function parentMerges<P extends ParentLike>(first: P[], second: P[]): { keep: P; drop: P }[] {
  const merges: { keep: P; drop: P }[] = []
  const used = new Set<string>()
  for (const a of first) {
    const b = second.find(candidate => !used.has(candidate.id) && sameParent(a, candidate))
    if (!b) continue
    used.add(b.id)
    const aFirst = (a.created_at ?? '') <= (b.created_at ?? '')
    merges.push(aFirst ? { keep: a, drop: b } : { keep: b, drop: a })
  }
  return merges
}

/** The fields the kept record lacks and the dropped one has, so nothing is lost by merging. */
export function fillBlanks<T extends Record<string, unknown>>(keep: T, drop: T, fields: (keyof T)[]): Partial<T> {
  const patch: Partial<T> = {}
  for (const field of fields) {
    const empty = keep[field] === null || keep[field] === undefined || keep[field] === ''
    const has = drop[field] !== null && drop[field] !== undefined && drop[field] !== ''
    if (empty && has) patch[field] = drop[field]
  }
  return patch
}
