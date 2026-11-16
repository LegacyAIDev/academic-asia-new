"use client"

import { Panel, PanelEmpty } from "@/components/ui/panel"
import { groupFamily } from "@/lib/students/family-relationships"
import type { SharedParent, StudentContactWithRelations } from "@/lib/supabase/queries/students"
import type { FamilyLinkToStudent, FamilySuggestion } from "@/lib/supabase/queries/student-family"
import { ContactDialog } from "./contact-dialog"
import type { ContactReferenceData } from "./family-contact-bits"
import { FamilyOthersList } from "./family-others-list"
import { FamilyParentCard } from "./family-parent-card"
import { FamilySiblingLine, type FamilyLineStudent } from "./family-sibling-line"
import { FamilySuggestions } from "./family-suggestions"

type StudentFamilySectionProps = {
  studentId: string
  /** The student whose page this is: their place on the family line. */
  student: FamilyLineStudent
  contacts: StudentContactWithRelations[]
  /** Links other students made to this one; shown here too, edited on their profile. */
  linksToStudent: FamilyLinkToStudent[]
  /** Students who are possibly family; loaded only for staff who may link them. */
  suggestions: FamilySuggestion[]
  /** Parents recorded on a linked brother or sister: the same people, shared. */
  sharedParents?: SharedParent[]
  referenceData: ContactReferenceData
  studentAddress?: string | null
  canWrite: boolean
}

function Eyebrow({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <h3 className="text-sm font-medium text-foreground">
      {children}
      {count !== undefined && <span className="ml-1.5 tabular-nums text-muted-foreground">{count}</span>}
    </h3>
  )
}

/**
 * The Family tab. Parents and guardians first, as the people staff call; then
 * brothers and sisters on one line in birth order with this student among them;
 * then everyone else, quietly. Family members who are students too link to
 * their own profile, and show on both students' tabs.
 */
export function StudentFamilySection({
  studentId, student, contacts, linksToStudent, suggestions, sharedParents = [], referenceData, studentAddress, canWrite,
}: StudentFamilySectionProps) {
  const groups = groupFamily(contacts, linksToStudent)
  const parentCount = groups.parents.length + sharedParents.length
  const total = parentCount + groups.siblings.length + groups.others.length
  const shared = { studentId, referenceData, studentAddress, canWrite }

  return (
    <Panel
      title="Family"
      count={total}
      action={canWrite && total > 0 ? (
        <ContactDialog studentId={studentId} referenceData={referenceData} mode="create" studentAddress={studentAddress} />
      ) : null}
    >
      <div className="space-y-8">
        {total === 0 && (
          <PanelEmpty
            title="No family members yet"
            action={canWrite ? <ContactDialog studentId={studentId} referenceData={referenceData} mode="create" studentAddress={studentAddress} /> : null}
          >
            {canWrite
              ? "Add the parents first. Link a brother or sister who is a student too, and their parents are shared."
              : "No parents, brothers or sisters have been recorded for this student."}
          </PanelEmpty>
        )}

        {parentCount > 0 && (
          <section className="space-y-3">
            <Eyebrow count={parentCount}>Parents and guardians</Eyebrow>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {groups.parents.map(entry => entry.kind === "contact" && (
                <FamilyParentCard key={entry.contact.id} contact={entry.contact} {...shared} />
              ))}
              {/* Recorded on a brother or sister: one record, so a change shows on every child. */}
              {sharedParents.map(parent => (
                <FamilyParentCard key={parent.id} contact={parent} {...shared} studentId={parent.owner.id}
                  sharedWith={[parent.owner.first_name, parent.owner.surname].filter(Boolean).join(" ")} />
              ))}
            </div>
          </section>
        )}

        {groups.siblings.length > 0 && (
          <section className="space-y-4">
            <Eyebrow count={groups.siblings.length}>Brothers and sisters (eldest first)</Eyebrow>
            <FamilySiblingLine student={student} siblings={groups.siblings} {...shared} />
          </section>
        )}

        {canWrite && (
          <FamilySuggestions studentId={studentId} suggestions={suggestions} relationships={referenceData.relationships} />
        )}

        {groups.others.length > 0 && (
          <section className="space-y-3">
            <Eyebrow count={groups.others.length}>Other family and contacts</Eyebrow>
            <FamilyOthersList entries={groups.others} {...shared} />
          </section>
        )}
      </div>
    </Panel>
  )
}
