/**
 * How a student's family members are grouped on the Family tab, and how a link
 * between two students reads from the other student's side.
 *
 * Relationship codes come from contact_relationships: mother, father, guardian,
 * brother, sister, uncle, auntie, grandfather, grandmother, cousin, friend, other.
 * Gender is 'M' or 'F' on both students and contacts.
 */

export type FamilyGroup = 'parents' | 'siblings' | 'others'

const PARENTS = new Set(['mother', 'father', 'guardian'])
const SIBLINGS = new Set(['brother', 'sister'])
const SAME_BOTH_WAYS: Record<string, string> = { cousin: 'Cousin', friend: 'Friend' }

/** Parents and guardians first, then brothers and sisters, then everyone else (as agreed with Jack). */
export function familyGroup(code: string | null | undefined): FamilyGroup {
  if (code && PARENTS.has(code)) return 'parents'
  if (code && SIBLINGS.has(code)) return 'siblings'
  return 'others'
}

/**
 * The relationship as the linked student sees it. When A lists B as a brother,
 * B's page shows A as a brother or sister by A's own gender. Cousins and friends
 * read the same both ways. Anything else (A listed B as an uncle, say) has no
 * word for the way back, so B simply sees A as family.
 */
export function relationshipSeenFrom(
  code: string | null | undefined,
  otherGender: string | null | undefined
): { group: FamilyGroup; label: string } {
  if (code && SIBLINGS.has(code)) {
    const label = otherGender === 'M' ? 'Brother' : otherGender === 'F' ? 'Sister' : 'Sibling'
    return { group: 'siblings', label }
  }
  return { group: 'others', label: (code && SAME_BOTH_WAYS[code]) || 'Family' }
}

/** The relationship to offer when staff link a suggested student as a sibling. */
export function siblingCodeFor(gender: string | null | undefined): 'brother' | 'sister' | null {
  return gender === 'M' ? 'brother' : gender === 'F' ? 'sister' : null
}

type ContactLike = { relationship: { code: string } | null; related_student_id: string | null }
type LinkLike = { relationshipCode: string | null; student: { id: string; gender: string | null } }

/** One card on the Family tab: a contact of this student, or a link another student made to them. */
export type FamilyEntry<C, L> =
  | { kind: 'contact'; contact: C }
  | { kind: 'link'; link: L; label: string }

/**
 * The Family tab's three groups. A link another student made shows in the group
 * its turned-round relationship belongs to, unless this student already links
 * back to the same student themself, which would show them twice.
 */
export function groupFamily<C extends ContactLike, L extends LinkLike>(contacts: C[], links: L[]) {
  const groups: Record<FamilyGroup, FamilyEntry<C, L>[]> = { parents: [], siblings: [], others: [] }
  for (const contact of contacts) groups[familyGroup(contact.relationship?.code)].push({ kind: 'contact', contact })

  const linkedHere = new Set(contacts.map((c) => c.related_student_id).filter(Boolean))
  for (const link of links) {
    if (linkedHere.has(link.student.id)) continue
    const seen = relationshipSeenFrom(link.relationshipCode, link.student.gender)
    groups[seen.group].push({ kind: 'link', link, label: seen.label })
  }
  return groups
}

/**
 * "Elder brother", "Younger sister": the relationship with the age told apart
 * when both birth dates are known (ISO dates compare as text). Same day or an
 * unknown date keeps the plain label.
 */
export function siblingAgeLabel(label: string, siblingBirth: string | null | undefined, studentBirth: string | null | undefined): string {
  if (!siblingBirth || !studentBirth || siblingBirth === studentBirth) return label
  return `${siblingBirth < studentBirth ? 'Elder' : 'Younger'} ${label.toLowerCase()}`
}

/** Eldest first by birth date; anyone without a date keeps their place after the rest. */
export function eldestFirst<T>(items: T[], birthDate: (item: T) => string | null | undefined): T[] {
  return [...items].sort((a, b) => {
    const first = birthDate(a)
    const second = birthDate(b)
    if (!first || !second) return first ? -1 : second ? 1 : 0
    return first < second ? -1 : first > second ? 1 : 0
  })
}

/** The priority staff set on a contact ("1 — Primary", "2 — Secondary", then 3 and on), in words. */
export function contactPriorityLabel(priority: number | null | undefined): string | null {
  if (priority == null || priority < 1) return null
  return priority === 1 ? 'Main contact' : priority === 2 ? 'Second contact' : `Contact ${priority}`
}
