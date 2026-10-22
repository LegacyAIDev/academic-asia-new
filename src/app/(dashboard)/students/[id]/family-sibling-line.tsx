"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/applications/application-display"
import { eldestFirst, siblingAgeLabel, type FamilyEntry } from "@/lib/students/family-relationships"
import { linkedStudentDetails, linkedStudentName } from "@/lib/students/linked-student-label"
import type { StudentContactWithRelations } from "@/lib/supabase/queries/students"
import type { FamilyLinkToStudent, LinkedStudent } from "@/lib/supabase/queries/student-family"
import { ContactLinks, MemberActions, memberDisplay, type ContactReferenceData } from "./family-contact-bits"

export type FamilyLineStudent = Pick<LinkedStudent, "first_name" | "surname" | "chinese_name" | "date_of_birth" | "student_code">

type SiblingEntry = FamilyEntry<StudentContactWithRelations, FamilyLinkToStudent>

type FamilySiblingLineProps = {
  student: FamilyLineStudent
  siblings: SiblingEntry[]
  studentId: string
  referenceData: ContactReferenceData
  studentAddress?: string | null
  canWrite: boolean
}

type Node =
  | { key: string; kind: "self" }
  | { key: string; kind: "sibling"; entry: SiblingEntry }

const birthOf = (entry: SiblingEntry) =>
  entry.kind === "link" ? entry.link.student.date_of_birth : entry.contact.related_student?.date_of_birth ?? null

/**
 * Brothers and sisters as dots on one line, eldest first, with this student in
 * their place among them (the filled dot). Order and "elder" or "younger" come
 * from birth dates; anyone typed in without one follows at the end. On a phone
 * the line runs down the page instead of across.
 */
export function FamilySiblingLine({ student, siblings, studentId, referenceData, studentAddress, canWrite }: FamilySiblingLineProps) {
  const nodes = eldestFirst<Node>(
    [{ key: "self", kind: "self" }, ...siblings.map((entry) => ({ key: entry.kind === "link" ? entry.link.contactId : entry.contact.id, kind: "sibling" as const, entry }))],
    (node) => (node.kind === "self" ? student.date_of_birth : birthOf(node.entry)),
  )

  return (
    <ol role="list" className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-6">
      {nodes.map((node) => (
        <li
          key={node.key}
          className={cn(
            "relative flex gap-3 sm:w-56 sm:flex-col sm:gap-3",
            // The line to the next dot: down the page on a phone, across from sm up. The last dot has none.
            "before:absolute before:border-border last:before:hidden",
            "before:left-[5px] before:top-4 before:-bottom-4 before:border-l",
            "sm:before:left-4 sm:before:-right-3 sm:before:top-[5px] sm:before:bottom-auto sm:before:border-l-0 sm:before:border-t",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "relative mt-0.5 size-3 shrink-0 rounded-full border-2 sm:mt-0",
              node.kind === "self" ? "border-primary bg-primary"
                : (node.entry.kind === "link" || node.entry.contact.related_student) ? "border-primary bg-card"
                : "border-muted-foreground bg-card",
            )}
          />
          <div className="min-w-0 flex-1">
            {node.kind === "self" ? <SelfNode student={student} /> : (
              <SiblingNode entry={node.entry} student={student} studentId={studentId}
                referenceData={referenceData} studentAddress={studentAddress} canWrite={canWrite} />
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}

function SelfNode({ student }: { student: FamilyLineStudent }) {
  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">This student</p>
      <p className="truncate text-sm font-semibold">{linkedStudentName(student)}</p>
      {student.date_of_birth && <p className="text-xs text-muted-foreground tabular-nums">born {formatDate(student.date_of_birth)}</p>}
    </>
  )
}

function SiblingNode({ entry, student, studentId, referenceData, studentAddress, canWrite }: {
  entry: SiblingEntry; student: FamilyLineStudent; studentId: string
  referenceData: ContactReferenceData; studentAddress?: string | null; canWrite: boolean
}) {
  const { linked, label, name } = memberDisplay(entry, "Sibling")

  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {siblingAgeLabel(label, linked?.date_of_birth, student.date_of_birth)}
        </p>
        {linked ? (
          <Link href={`/students/${linked.id}?tab=family`}
            className="block break-words text-sm font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {name}
          </Link>
        ) : (
          <p className="break-words text-sm font-semibold">{name || "Name not recorded"}</p>
        )}
        {linked && <p className="text-xs text-muted-foreground tabular-nums">{linkedStudentDetails(linked)}</p>}
        {entry.kind === "contact" && <div className="mt-1"><ContactLinks contact={entry.contact} /></div>}
        {entry.kind === "link" && <p className="mt-1 text-xs text-muted-foreground">Linked from their profile</p>}
        {entry.kind === "contact" && !linked && <p className="mt-1 text-xs text-muted-foreground">Not linked to a student</p>}
      </div>
      {canWrite && entry.kind === "contact" && (
        <MemberActions contact={entry.contact} studentId={studentId} referenceData={referenceData} studentAddress={studentAddress} name={name} />
      )}
    </div>
  )
}
