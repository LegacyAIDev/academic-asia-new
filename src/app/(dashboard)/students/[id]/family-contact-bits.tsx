"use client"

import { Mail, Phone } from "lucide-react"
import type { FamilyEntry } from "@/lib/students/family-relationships"
import { linkedStudentName } from "@/lib/students/linked-student-label"
import { telHref } from "@/lib/students/phone-link"
import type { StudentContactWithRelations } from "@/lib/supabase/queries/students"
import type { FamilyLinkToStudent } from "@/lib/supabase/queries/student-family"
import { DeleteContactButton, EditContactButton } from "./contact-dialog"

export type ContactReferenceData = {
  relationships: { id: number; code: string; label: string }[]
  titles: { id: number; code: string; label: string }[]
}

/** "Mrs Amy CHAN"; empty when staff recorded no name. */
export function contactName(contact: StudentContactWithRelations): string {
  return [contact.title?.label, contact.first_name, contact.surname].filter(Boolean).join(" ")
}

/**
 * What a sibling or other-family row shows: the linked student when there is
 * one, otherwise the typed-in contact.
 */
export function memberDisplay(entry: FamilyEntry<StudentContactWithRelations, FamilyLinkToStudent>, fallbackLabel: string) {
  if (entry.kind === "link") return { linked: entry.link.student, label: entry.label, name: linkedStudentName(entry.link.student) }
  const linked = entry.contact.related_student
  return {
    linked,
    label: entry.contact.relationship?.label ?? fallbackLabel,
    name: linked ? linkedStudentName(linked) : contactName(entry.contact),
  }
}

const linkClass = "inline-flex min-h-9 items-center gap-1.5 rounded-sm text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

/**
 * How to reach a family member, each line a link that starts the call or the
 * email. Home and office numbers are labelled; the mobile needs no label.
 */
export function ContactLinks({ contact }: { contact: StudentContactWithRelations }) {
  const phones = [
    { label: null, value: contact.mobile },
    { label: "Home", value: contact.telephone },
    { label: "Office", value: contact.office_telephone },
  ].filter((p): p is { label: string | null; value: string } => !!p.value)
  // The same address typed twice is shown once.
  const emails = [...new Set([contact.email_1, contact.email_2, contact.email_3].filter((e): e is string => !!e?.trim()))]
  if (phones.length === 0 && emails.length === 0) return null

  return (
    <ul role="list" className="text-sm">
      {phones.map((phone) => {
        const href = telHref(phone.value)
        const content = (
          <>
            <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            {phone.label && <span className="text-xs text-muted-foreground">{phone.label}</span>}
            {phone.value}
          </>
        )
        return (
          <li key={`${phone.label}-${phone.value}`}>
            {href ? <a href={href} className={`${linkClass} tabular-nums`}>{content}</a>
              : <span className="inline-flex min-h-9 items-center gap-1.5 tabular-nums">{content}</span>}
          </li>
        )
      })}
      {emails.map((email) => (
        <li key={email} className="min-w-0">
          <a href={`mailto:${email}`} title={email} className={`${linkClass} max-w-full`}>
            <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{email}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

type MemberActionsProps = {
  contact: StudentContactWithRelations
  studentId: string
  referenceData: ContactReferenceData
  studentAddress?: string | null
  /** The name the delete question uses. */
  name: string
}

/** Edit and remove a family member; the callers show this only to staff who may edit students. */
export function MemberActions({ contact, studentId, referenceData, studentAddress, name }: MemberActionsProps) {
  return (
    <div className="-mr-2 -mt-1 flex shrink-0 items-center">
      <EditContactButton contact={contact} studentId={studentId} referenceData={referenceData} studentAddress={studentAddress} />
      <DeleteContactButton contactId={contact.id} studentId={studentId} contactName={name || "this family member"} />
    </div>
  )
}
