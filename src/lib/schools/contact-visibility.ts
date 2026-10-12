/**
 * Which of a school's contacts the main list shows. Staff come and go, so a
 * contact can be marked inactive instead of being deleted; inactive contacts
 * stay stored and are only listed when someone asks to see them.
 */

type WithActiveFlag = { is_active: boolean }

/** The contacts to list, in the order given: active ones, plus the inactive ones when asked for. */
export function visibleContacts<T extends WithActiveFlag>(contacts: T[], showInactive: boolean): T[] {
  return showInactive ? contacts : contacts.filter(contact => contact.is_active)
}

export function countInactive(contacts: WithActiveFlag[]): number {
  return contacts.filter(contact => !contact.is_active).length
}
