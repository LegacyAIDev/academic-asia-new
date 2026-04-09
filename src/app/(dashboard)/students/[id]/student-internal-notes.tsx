"use client"

import { useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { StickyNote, Loader2, Check } from "lucide-react"
import { toast } from "sonner"
import { upsertStudentInternalNotes } from "@/lib/supabase/actions/student-internal-notes"
import type { InternalNotesRecord } from "@/lib/supabase/queries/student-internal-notes"

type Props = {
  studentId: string
  notes: InternalNotesRecord | null
}

const textareaStyles = "resize-none bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-sm"

export function StudentInternalNotesSection({ studentId, notes }: Props) {
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await upsertStudentInternalNotes({
        student_id: studentId,
        character: (fd.get("character") as string) || null,
        strategy: (fd.get("strategy") as string) || null,
        parent_expectations: (fd.get("parent_expectations") as string) || null,
        disability_sen: (fd.get("disability_sen") as string) || null,
        medical_notes: (fd.get("medical_notes") as string) || null,
        guardianship_notes: (fd.get("guardianship_notes") as string) || null,
        additional_remarks: (fd.get("additional_remarks") as string) || null,
      })
      if (result?.success) toast.success("Internal notes saved")
      else toast.error(result?.error ?? "Failed to save notes")
    })
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-muted-foreground" />
          Internal Notes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Student Profile Notes */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student Profile</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Character" name="character" value={notes?.character} placeholder="Character traits..." />
              <Field label="Strategy" name="strategy" value={notes?.strategy} placeholder="Placement strategy..." />
              <Field label="Parent Expectations" name="parent_expectations" value={notes?.parent_expectations} placeholder="Parent expectations..." />
            </div>
          </div>

          {/* Sensitive Information */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Sensitive Information</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Disability / SEN" name="disability_sen" value={notes?.disability_sen} placeholder="Special educational needs..." />
              <Field label="Medical Notes" name="medical_notes" value={notes?.medical_notes} placeholder="Medical information..." />
            </div>
          </div>

          {/* Additional */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider">Additional</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Guardianship Notes" name="guardianship_notes" value={notes?.guardianship_notes} placeholder="Guardianship arrangements..." />
              <Field label="Additional Remarks" name="additional_remarks" value={notes?.additional_remarks} placeholder="Any other notes..." />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save Notes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function Field({ label, name, value, placeholder }: {
  label: string; name: string; value: string | null | undefined; placeholder: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Textarea name={name} rows={3} className={textareaStyles} defaultValue={value ?? ""} placeholder={placeholder} />
    </div>
  )
}
