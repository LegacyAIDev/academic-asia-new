export type NamedPerson = { first_name: string | null; surname: string | null }

/** "First Surname" with missing parts dropped; an empty string when nothing is known. */
export function personName(person: NamedPerson | null | undefined): string {
  return person ? `${person.first_name ?? ''} ${person.surname ?? ''}`.trim() : ''
}
