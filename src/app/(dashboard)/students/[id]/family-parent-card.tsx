"use client"

import Link from "next/link"
import { contactPriorityLabel } from "@/lib/students/family-relationships"
import { linkedStudentName } from "@/lib/students/linked-student-label"
import type { StudentContactWithRelations } from "@/lib/supabase/queries/students"
import { ContactLinks, MemberActions, contactName, type ContactReferenceData } from "./family-contact-bits"

type FamilyParentCardProps = {
  contact: StudentContactWithRelations
  studentId: string
  referenceData: ContactReferenceData
  studentAddress?: string | null
  canWrite: boolean
}

/**
 * A parent or guardian: the people staff call. Who they are to the student and
 * whether they are the main contact come first, then how to reach them.
 */
export function FamilyParentCard({ contact, studentId, referenceData, studentAddress, canWrite }: FamilyParentCardProps) {
  const name = contact.related_student ? linkedStudentName(contact.related_student) : contactName(contact)
  const priority = contactPriorityLabel(contact.priority)

  return (
    <article aria-label={name || contact.relationship?.label} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {contact.relationship?.label ?? "Family"}
            {/* Only the main contact stands out: it is who staff call first. */}
            {priority && <span className={contact.priority === 1 ? "text-primary" : undefined}> · {priority}</span>}
          </p>
          {contact.related_student ? (
            <Link href={`/students/${contact.related_student.id}?tab=family`}
              className="mt-1 block truncate text-base font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {name}
            </Link>
          ) : (
            <p className={name ? "mt-1 truncate text-base font-semibold" : "mt-1 text-sm text-muted-foreground"}>{name || "Name not recorded"}</p>
          )}
          {contact.occupation && <p className="truncate text-sm text-muted-foreground">{contact.occupation}</p>}
        </div>
        {canWrite && (
          <MemberActions contact={contact} studentId={studentId} referenceData={referenceData} studentAddress={studentAddress} name={name} />
        )}
      </div>
      <ContactLinks contact={contact} />
    </article>
  )
}
