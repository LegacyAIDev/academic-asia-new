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

/** Old tab names still arrive from saved links. */
export function sectionFromParam(value: string | undefined): StudentSectionKey {
  const aliases: Record<string, StudentSectionKey> = { profile: "overview", contacts: "family" }
  const wanted = value ? aliases[value] ?? value : "overview"
  return STUDENT_SECTIONS.some(s => s.key === wanted) ? (wanted as StudentSectionKey) : "overview"
}

/** What the Add menu can start, the section it lives in and its pop-up key (see useAddParam). */
export const ADD_ACTIONS = [
  { label: "School application", section: "applications", add: "application" },
  { label: "Family member", section: "family", add: "family-member" },
  { label: "Tutoring course", section: "education", add: "education" },
  { label: "Exam result", section: "education", add: "exam-result" },
  { label: "Resume entry", section: "resume", add: "resume" },
  { label: "Event application", section: "events", add: "event-application" },
  { label: "Visa", section: "immigration", add: "visa" },
  { label: "Travel booking", section: "immigration", add: "travel" },
] as const
