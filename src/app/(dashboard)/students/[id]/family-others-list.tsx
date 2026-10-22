"use client"

import Link from "next/link"
import type { FamilyEntry } from "@/lib/students/family-relationships"
import { linkedStudentDetails } from "@/lib/students/linked-student-label"
import type { StudentContactWithRelations } from "@/lib/supabase/queries/students"
import type { FamilyLinkToStudent } from "@/lib/supabase/queries/student-family"
import { ContactLinks, MemberActions, memberDisplay, type ContactReferenceData } from "./family-contact-bits"

type OtherEntry = FamilyEntry<StudentContactWithRelations, FamilyLinkToStudent>

type FamilyOthersListProps = {
  entries: OtherEntry[]
  studentId: string
  referenceData: ContactReferenceData
  studentAddress?: string | null
  canWrite: boolean
}

/** Uncles, aunts, grandparents, cousins and friends: rarely called, so one quiet row each. */
export function FamilyOthersList({ entries, studentId, referenceData, studentAddress, canWrite }: FamilyOthersListProps) {
  return (
    <ul role="list" className="divide-y divide-border rounded-xl border border-border">
      {entries.map((entry) => {
        const { linked, label, name } = memberDisplay(entry, "Contact")
        return (
          <li key={entry.kind === "link" ? entry.link.contactId : entry.contact.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 px-4 py-3">
            <p className="w-28 shrink-0 pt-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            <div className="min-w-0 flex-1 basis-56 space-y-1">
              {linked ? (
                <Link href={`/students/${linked.id}?tab=family`}
                  className="block truncate text-sm font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {name}
                </Link>
              ) : (
                <p className="truncate text-sm font-semibold">{name || "Name not recorded"}</p>
              )}
              {linked && <p className="text-xs text-muted-foreground tabular-nums">{linkedStudentDetails(linked)}</p>}
              {entry.kind === "contact" && entry.contact.occupation && <p className="text-xs text-muted-foreground">{entry.contact.occupation}</p>}
              {entry.kind === "contact" && <ContactLinks contact={entry.contact} />}
              {entry.kind === "link" && <p className="text-xs text-muted-foreground">Linked from their profile</p>}
            </div>
            {canWrite && entry.kind === "contact" && (
              <MemberActions contact={entry.contact} studentId={studentId} referenceData={referenceData} studentAddress={studentAddress} name={name} />
            )}
          </li>
        )
      })}
    </ul>
  )
}
