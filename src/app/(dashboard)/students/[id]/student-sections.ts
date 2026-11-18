/** The sections of a student, in the order of the section bar. `add` names the pop-up the Add menu opens there. */
export const STUDENT_SECTIONS = [
  { key: "overview", label: "Overview" },
  { key: "applications", label: "Applications" },
  { key: "family", label: "Family" },
  { key: "education", label: "Tutoring & exams" },
  { key: "resume", label: "Resume" },
  { key: "documents", label: "Documents" },
  { key: "communications", label: "Communications" },
  { key: "events", label: "Events" },
  { key: "calendar", label: "Calendar" },
  { key: "immigration", label: "Visas & travel" },
] as const

export type StudentSectionKey = (typeof STUDENT_SECTIONS)[number]["key"]

/**
 * Sections kept in the code but not shown. Tutoring & exams is the old
 * system's tutoring; it returns later as its own module (meeting, 18 Nov), and
 * its "exams" were easily confused with the Exams area.
 */
export const HIDDEN_SECTIONS: ReadonlySet<StudentSectionKey> = new Set<StudentSectionKey>(["education"])

/** The sections shown in the section bar. */
export const VISIBLE_SECTIONS = STUDENT_SECTIONS.filter(section => !HIDDEN_SECTIONS.has(section.key))

/** Old tab names still arrive from saved links. */
export function sectionFromParam(value: string | undefined): StudentSectionKey {
  const aliases: Record<string, StudentSectionKey> = { profile: "overview", contacts: "family" }
  const wanted = value ? aliases[value] ?? value : "overview"
  return VISIBLE_SECTIONS.some(s => s.key === wanted) ? (wanted as StudentSectionKey) : "overview"
}

/** What the Add menu can start, the section it lives in and its pop-up key (see useAddParam). */
export const ADD_ACTIONS = [
  { label: "School application", section: "applications", add: "application" },
  { label: "Family member", section: "family", add: "family-member" },
  { label: "Resume entry", section: "resume", add: "resume" },
  { label: "Event application", section: "events", add: "event-application" },
  { label: "Visa", section: "immigration", add: "visa" },
  { label: "Travel booking", section: "immigration", add: "travel" },
] as const
