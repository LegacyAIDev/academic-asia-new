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
