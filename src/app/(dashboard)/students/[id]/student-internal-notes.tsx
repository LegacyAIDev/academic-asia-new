"use client"

import { useState, useTransition } from "react"
import { Loader2, Pencil, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Panel, PanelEmpty } from "@/components/ui/panel"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useRouterWithProgress } from "@/components/layout/navigation-progress"
import { upsertStudentInternalNotes } from "@/lib/supabase/actions/student-internal-notes"
import type { InternalNotesRecord } from "@/lib/supabase/queries/student-internal-notes"

type Props = {
  studentId: string
  notes: InternalNotesRecord | null
  /** Without write access the notes are shown with no Edit. */
  canWrite: boolean
}

type Key = "character" | "strategy" | "parent_expectations" | "disability_sen" | "medical_notes" | "guardianship_notes" | "additional_remarks"

const GROUPS: { title: string; sensitive?: boolean; fields: { key: Key; label: string; placeholder: string }[] }[] = [
  {
    title: "Student profile",
    fields: [
      { key: "character", label: "Character", placeholder: "Character traits" },
      { key: "strategy", label: "Strategy", placeholder: "Placement strategy" },
      { key: "parent_expectations", label: "Parent expectations", placeholder: "What the family hopes for" },
    ],
  },
  {
    title: "Sensitive",
    sensitive: true,
    fields: [
      { key: "disability_sen", label: "Disability / SEN", placeholder: "Special educational needs" },
      { key: "medical_notes", label: "Medical", placeholder: "Medical information" },
    ],
  },
  {
    title: "Other",
    fields: [
      { key: "guardianship_notes", label: "Guardianship", placeholder: "Guardianship arrangements" },
      { key: "additional_remarks", label: "Remarks", placeholder: "Anything else" },
    ],
  },
]

const filledText = (notes: InternalNotesRecord | null, key: Key) => {
  const value = notes?.[key]
  return typeof value === "string" && value.trim() !== "" ? value : null
}

/**
 * Staff-only notes on the student: shown as a short summary of what is filled
 * in, edited in a pop-up rather than as seven open boxes on the page.
 */
export function StudentInternalNotesSection({ studentId, notes, canWrite }: Props) {
  const [editing, setEditing] = useState(false)
  const filled = GROUPS.flatMap(g => g.fields.filter(f => filledText(notes, f.key)).map(f => ({ ...f, sensitive: g.sensitive })))

  return (
    <Panel
      title="Internal notes"
      action={canWrite && filled.length > 0 ? (
        <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => setEditing(true)}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      ) : null}
    >
      {filled.length === 0 ? (
        <PanelEmpty
          title="No internal notes yet"
          action={canWrite ? (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
              <Plus className="h-3.5 w-3.5" /> Add internal notes
            </Button>
          ) : null}
        >
          Character, strategy, family expectations and any sensitive needs. Seen by staff only.
        </PanelEmpty>
      ) : (
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {filled.map(field => (
            <div key={field.key} className="min-w-0">
              <dt className={field.sensitive ? "text-xs font-medium text-destructive" : "text-xs text-muted-foreground"}>
                {field.label}{field.sensitive ? " (sensitive)" : ""}
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm">{filledText(notes, field.key)}</dd>
            </div>
          ))}
        </dl>
      )}
      {canWrite && <InternalNotesDialog studentId={studentId} notes={notes} open={editing} onOpenChange={setEditing} />}
    </Panel>
  )
}

function InternalNotesDialog({ studentId, notes, open, onOpenChange }: {
  studentId: string
  notes: InternalNotesRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouterWithProgress()
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const value = (key: Key) => (fd.get(key) as string)?.trim() || null
    startTransition(async () => {
      const result = await upsertStudentInternalNotes({
        student_id: studentId,
        character: value("character"),
        strategy: value("strategy"),
        parent_expectations: value("parent_expectations"),
        disability_sen: value("disability_sen"),
        medical_notes: value("medical_notes"),
        guardianship_notes: value("guardianship_notes"),
        additional_remarks: value("additional_remarks"),
      })
      if (result?.success) {
        toast.success("Internal notes saved")
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error(result?.error ?? "The notes could not be saved. Try again.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Internal notes</DialogTitle>
          <DialogDescription>Seen by Academic Asia staff only. Leave a box empty if it does not apply.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {GROUPS.map(group => (
            <fieldset key={group.title} className="space-y-3">
              <legend className={group.sensitive ? "text-sm font-semibold text-destructive" : "text-sm font-semibold"}>{group.title}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {group.fields.map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <Label htmlFor={`internal-${field.key}`} className="text-xs text-muted-foreground">{field.label}</Label>
                    <Textarea id={`internal-${field.key}`} name={field.key} rows={3} className="resize-y text-sm" defaultValue={notes?.[field.key] ?? ""} placeholder={field.placeholder} />
                  </div>
                ))}
              </div>
            </fieldset>
          ))}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending} className="gap-1.5">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save notes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
