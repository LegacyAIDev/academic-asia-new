"use client"

import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { LinkDraft, LinkedRecord } from "@/lib/emails/email-draft"
import type { ApplicationOption } from "@/lib/supabase/queries/filed-emails"
import { listApplicationOptions, searchSchoolsForEmail } from "@/lib/supabase/actions/filed-email-records"
import { searchStudentsForFamilyAction } from "@/lib/supabase/actions/student-family"
import { RecordSearchPicker } from "./record-search-picker"

const NONE = "none"
/** The student search excludes one id; no real student has the nil uuid. */
const NO_STUDENT = "00000000-0000-0000-0000-000000000000"

type Props = {
  value: LinkDraft
  onChange: (links: LinkDraft) => void
  /** The record whose page this is; shown fixed rather than as a picker. */
  locked: "student" | "school" | null
  idPrefix: string
}

async function searchStudents(query: string): Promise<LinkedRecord[] | null> {
  const result = await searchStudentsForFamilyAction(query, NO_STUDENT)
  if (!result.success) return null
  return (result.data ?? []).map(s => ({
    id: s.id,
    name: `${[s.first_name, s.surname].filter(Boolean).join(" ") || "Student"}${s.student_code ? ` (${s.student_code})` : ""}`,
  }))
}

async function searchSchools(query: string): Promise<LinkedRecord[] | null> {
  const result = await searchSchoolsForEmail(query)
  return result.success ? result.data ?? [] : null
}

/**
 * Where the email is filed (EF-10 to EF-13): a student, a school, or both
 * (D4), and optionally one of the student's applications. Choosing an
 * application fills in its school when none is chosen yet.
 */
export function EmailLinkFields({ value, onChange, locked, idPrefix }: Props) {
  // Kept with the student they were loaded for, so a change of student never shows the old list.
  const [loaded, setLoaded] = useState<{ studentId: string; options: ApplicationOption[] } | null>(null)
  const studentId = value.student?.id ?? null
  const applications = loaded && loaded.studentId === studentId ? loaded.options : []

  useEffect(() => {
    if (!studentId) return
    let current = true
    listApplicationOptions(studentId)
      .then(result => { if (current) setLoaded({ studentId, options: result.success ? result.data ?? [] : [] }) })
      .catch(() => { if (current) setLoaded({ studentId, options: [] }) })
    return () => { current = false }
  }, [studentId])

  const schoolSuggestions = [...new Map(applications.map(a => [a.schoolId, { id: a.schoolId, name: a.schoolName }])).values()]

  const setApplication = (id: string) => {
    if (id === NONE) return onChange({ ...value, applicationId: null })
    const app = applications.find(a => a.id === id)
    onChange({ ...value, applicationId: id, school: value.school ?? (app ? { id: app.schoolId, name: app.schoolName } : null) })
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>Student</Label>
        {locked === "student" && value.student ? (
          <p className="flex min-h-9 items-center rounded-md bg-muted/50 px-3 text-sm">{value.student.name}</p>
        ) : (
          <RecordSearchPicker
            label="Student" value={value.student} search={searchStudents} placeholder="Link a student (optional)"
            onChange={student => onChange({ ...value, student, applicationId: null })}
          />
        )}
      </div>
      <div className="space-y-1.5">
        <Label>School</Label>
        {locked === "school" && value.school ? (
          <p className="flex min-h-9 items-center rounded-md bg-muted/50 px-3 text-sm">{value.school.name}</p>
        ) : (
          <RecordSearchPicker
            label="School" value={value.school} search={searchSchools} suggestions={schoolSuggestions}
            placeholder="Also show on a school (optional)" onChange={school => onChange({ ...value, school })}
          />
        )}
      </div>
      {value.student && (
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-application`}>Application</Label>
          <Select value={value.applicationId ?? NONE} onValueChange={setApplication}>
            <SelectTrigger id={`${idPrefix}-application`} className="w-full">
              <SelectValue placeholder="No application" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>No application</SelectItem>
              {applications.map(a => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
