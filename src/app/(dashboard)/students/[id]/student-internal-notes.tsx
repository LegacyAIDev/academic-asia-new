"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StickyNote } from "lucide-react"
import { InternalNotesDialog } from "./internal-notes-dialog"
import type { InternalNotesRecord } from "@/lib/supabase/queries/student-internal-notes"

type Props = {
  studentId: string
  notes: InternalNotesRecord | null
}

function NoteField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium whitespace-pre-wrap">{value}</p>
    </div>
  )
}

/** Group of related note fields with a subtle visual separator */
function NoteGroup({ children }: { children: React.ReactNode }) {
  const filtered = (Array.isArray(children) ? children : [children]).filter(Boolean)
  if (filtered.length === 0) return null
  return <div className="space-y-3">{filtered}</div>
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    })
  } catch { return dateStr }
}

export function StudentInternalNotesSection({ studentId, notes }: Props) {
  if (!notes) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-muted-foreground" />
              Internal Notes
            </CardTitle>
            <InternalNotesDialog studentId={studentId} />
          </div>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center">
            <StickyNote className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-foreground mb-1">No internal notes yet</h3>
            <p className="text-sm text-muted-foreground">
              Add confidential staff notes for this student
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasAnyNote = notes.character || notes.strategy || notes.parent_expectations
    || notes.disability_sen || notes.medical_notes || notes.guardianship_notes
    || notes.additional_remarks

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-muted-foreground" />
            Internal Notes
          </CardTitle>
          <InternalNotesDialog studentId={studentId} notes={notes} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasAnyNote ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            All fields are empty — click Edit to add notes.
          </p>
        ) : (
          <div className="space-y-4 divide-y divide-border/50 [&>*:not(:first-child)]:pt-4">
            <NoteGroup>
              <NoteField label="Character" value={notes.character} />
              <NoteField label="Strategy" value={notes.strategy} />
              <NoteField label="Parent Expectations" value={notes.parent_expectations} />
            </NoteGroup>

            <NoteGroup>
              <NoteField label="Disability / SEN" value={notes.disability_sen} />
              <NoteField label="Medical Notes" value={notes.medical_notes} />
            </NoteGroup>

            <NoteGroup>
              <NoteField label="Guardianship Notes" value={notes.guardianship_notes} />
              <NoteField label="Additional Remarks" value={notes.additional_remarks} />
            </NoteGroup>
          </div>
        )}

        <div className="pt-2 text-xs text-muted-foreground">
          Last updated: {formatDate(notes.updated_at)}
          {notes.assigned_profile?.full_name && (
            <> by <span className="font-medium text-foreground">{notes.assigned_profile.full_name}</span></>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
