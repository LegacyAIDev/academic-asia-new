"use client"

import { Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { groupFamily } from "@/lib/students/family-relationships"
import type { StudentContactWithRelations } from "@/lib/supabase/queries/students"
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
  referenceData: ContactReferenceData
  studentAddress?: string | null
  canWrite: boolean
}

function Eyebrow({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
      {count !== undefined && <span className="tabular-nums"> · {count}</span>}
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
  studentId, student, contacts, linksToStudent, suggestions, referenceData, studentAddress, canWrite,
}: StudentFamilySectionProps) {
  const groups = groupFamily(contacts, linksToStudent)
  const total = groups.parents.length + groups.siblings.length + groups.others.length
  const shared = { studentId, referenceData, studentAddress, canWrite }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base font-medium">
            <h2 className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
              Family {total > 0 && <span className="text-muted-foreground tabular-nums">({total})</span>}
            </h2>
          </CardTitle>
          {canWrite && (
            <ContactDialog studentId={studentId} referenceData={referenceData} mode="create" studentAddress={studentAddress} />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {total === 0 && (
          <div className="py-6 text-center">
            <h3 className="mb-1 text-sm font-medium">No family members yet</h3>
            <p className="text-sm text-muted-foreground">
              {canWrite
                ? "Add the parents first. A brother or sister who is a student too can be picked from the students."
                : "No parents, brothers or sisters have been recorded for this student."}
            </p>
          </div>
        )}

        {groups.parents.length > 0 && (
          <section className="space-y-3">
            <Eyebrow count={groups.parents.length}>Parents and guardians</Eyebrow>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {groups.parents.map(entry => entry.kind === "contact" && (
                <FamilyParentCard key={entry.contact.id} contact={entry.contact} {...shared} />
              ))}
            </div>
          </section>
        )}

        {groups.siblings.length > 0 && (
          <section className="space-y-4">
            <Eyebrow count={groups.siblings.length}>Brothers and sisters, eldest first</Eyebrow>
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
      </CardContent>
    </Card>
  )
}
