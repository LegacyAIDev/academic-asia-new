"use client"

import { Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { groupFamily, type FamilyEntry, type FamilyGroup } from "@/lib/students/family-relationships"
import { linkedStudentName } from "@/lib/students/linked-student-label"
import type { StudentContactWithRelations } from "@/lib/supabase/queries/students"
import type { FamilyLinkToStudent } from "@/lib/supabase/queries/student-family"
import { ContactDialog, DeleteContactButton, EditContactButton } from "./contact-dialog"
import { FamilyMemberCard, type ContactReferenceData } from "./family-member-card"
import { LinkedStudentCard } from "./linked-student-card"

type StudentFamilySectionProps = {
  studentId: string
  contacts: StudentContactWithRelations[]
  /** Links other students made to this one; shown here too, edited on their profile. */
  linksToStudent: FamilyLinkToStudent[]
  referenceData: ContactReferenceData
  studentAddress?: string | null
  canWrite: boolean
}

const GROUPS: { key: FamilyGroup; label: string }[] = [
  { key: "parents", label: "Parents and guardians" },
  { key: "siblings", label: "Brothers and sisters" },
  { key: "others", label: "Other family and contacts" },
]

/**
 * The Family tab: parents and guardians first, then brothers and sisters, then
 * everyone else, as agreed with Jack. Family members who are students too show
 * as student cards linking to their profile, from both students' side.
 */
export function StudentFamilySection({
  studentId, contacts, linksToStudent, referenceData, studentAddress, canWrite,
}: StudentFamilySectionProps) {
  const groups = groupFamily(contacts, linksToStudent)
  const total = GROUPS.reduce((n, g) => n + groups[g.key].length, 0)

  function renderEntry(entry: FamilyEntry<StudentContactWithRelations, FamilyLinkToStudent>) {
    if (entry.kind === "link") {
      return <LinkedStudentCard key={entry.link.contactId} student={entry.link.student} label={entry.label} linkedFromOtherProfile />
    }
    const { contact } = entry
    if (!contact.related_student) {
      return (
        <FamilyMemberCard
          key={contact.id}
          contact={contact}
          studentId={studentId}
          referenceData={referenceData}
          studentAddress={studentAddress}
          canWrite={canWrite}
        />
      )
    }
    return (
      <LinkedStudentCard
        key={contact.id}
        student={contact.related_student}
        label={contact.relationship?.label ?? "Family"}
        contactLine={[contact.mobile, contact.email_1].filter(Boolean).join(" · ")}
        actions={canWrite && (
          <>
            <EditContactButton contact={contact} studentId={studentId} referenceData={referenceData} studentAddress={studentAddress} />
            <DeleteContactButton contactId={contact.id} studentId={studentId} contactName={linkedStudentName(contact.related_student)} />
          </>
        )}
      />
    )
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Users className="h-4 w-4 text-muted-foreground" />
            Family {total > 0 && <span className="text-muted-foreground tabular-nums">({total})</span>}
          </CardTitle>
          {canWrite && (
            <ContactDialog studentId={studentId} referenceData={referenceData} mode="create" studentAddress={studentAddress} />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {total === 0 ? (
          <div className="py-8 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-1 text-sm font-medium">No family members yet</h3>
            <p className="text-sm text-muted-foreground">
              Add parents, brothers and sisters or other contacts. A brother or sister who is a student too can be picked from the students.
            </p>
          </div>
        ) : (
          GROUPS.filter((g) => groups[g.key].length > 0).map((group) => (
            <section key={group.key} className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label} <span className="tabular-nums">· {groups[group.key].length}</span>
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{groups[group.key].map(renderEntry)}</div>
            </section>
          ))
        )}
      </CardContent>
    </Card>
  )
}
