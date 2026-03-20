"use client"

import { useState, useTransition } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Loader2, Pencil, StickyNote, Check, ShieldAlert, Heart } from "lucide-react"
import {
  upsertStudentInternalNotes, type UpsertInternalNotesInput,
} from "@/lib/supabase/actions/student-internal-notes"
import type { InternalNotesRecord } from "@/lib/supabase/queries/student-internal-notes"

type InternalNotesDialogProps = {
  studentId: string
  notes?: InternalNotesRecord | null
  trigger?: React.ReactNode
}

function FormSection({ icon: Icon, title, children, accentColor = "primary" }: {
  icon: React.ElementType; title: string; children: React.ReactNode
  accentColor?: "primary" | "teal" | "amber" | "rose"
}) {
  const accentStyles = {
    primary: "from-primary/20 to-primary/5 text-primary",
    teal: "from-teal-500/20 to-teal-500/5 text-teal-600",
    amber: "from-amber-500/20 to-amber-500/5 text-amber-600",
    rose: "from-rose-500/20 to-rose-500/5 text-rose-600",
  }
  return (
    <div className="group">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${accentStyles[accentColor]}`}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

const textareaStyles = "resize-none bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"

export function InternalNotesDialog({ studentId, notes, trigger }: InternalNotesDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const isEdit = !!notes

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)

    const input: UpsertInternalNotesInput = {
      student_id: studentId,
      character: (fd.get("character") as string) || null,
      strategy: (fd.get("strategy") as string) || null,
      parent_expectations: (fd.get("parent_expectations") as string) || null,
      disability_sen: (fd.get("disability_sen") as string) || null,
      medical_notes: (fd.get("medical_notes") as string) || null,
      guardianship_notes: (fd.get("guardianship_notes") as string) || null,
      additional_remarks: (fd.get("additional_remarks") as string) || null,
    }

    startTransition(async () => {
      const result = await upsertStudentInternalNotes(input)
      if (result?.success) setOpen(false)
      else setError(result?.error ?? "An error occurred")
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-2 shadow-sm bg-primary hover:bg-primary/90 transition-all duration-200">
            {isEdit ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isEdit ? "Edit Notes" : "Add Notes"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:!max-w-[600px] !max-h-[92vh] !overflow-hidden !p-0 !gap-0 bg-background flex flex-col" showCloseButton={false}>
        <div className="relative overflow-hidden border-b border-border/50">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-60" />
          <div className="relative flex items-center gap-4 px-6 py-5">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25">
                <StickyNote className="h-5 w-5" />
              </div>
            </div>
            <DialogHeader className="flex-1 space-y-1">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {isEdit ? "Edit Internal Notes" : "Add Internal Notes"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {isEdit ? "Update confidential staff notes" : "Add confidential staff notes for this student"}
              </p>
            </DialogHeader>
            <button onClick={() => setOpen(false)} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive animate-in slide-in-from-top-2 duration-300">
                <span className="font-medium">{error}</span>
              </div>
            )}

            <FormSection icon={StickyNote} title="Student Profile Notes">
              <FormField label="Character">
                <Textarea name="character" rows={2} className={textareaStyles} defaultValue={notes?.character ?? ""} placeholder="Student character traits..." />
              </FormField>
              <FormField label="Strategy">
                <Textarea name="strategy" rows={2} className={textareaStyles} defaultValue={notes?.strategy ?? ""} placeholder="Placement strategy..." />
              </FormField>
              <FormField label="Parent Expectations">
                <Textarea name="parent_expectations" rows={2} className={textareaStyles} defaultValue={notes?.parent_expectations ?? ""} placeholder="Parent expectations and requirements..." />
              </FormField>
            </FormSection>

            <FormSection icon={ShieldAlert} title="Sensitive Information" accentColor="rose">
              <FormField label="Disability / SEN">
                <Textarea name="disability_sen" rows={2} className={textareaStyles} defaultValue={notes?.disability_sen ?? ""} placeholder="Special educational needs or disability info..." />
              </FormField>
              <FormField label="Medical Notes">
                <Textarea name="medical_notes" rows={2} className={textareaStyles} defaultValue={notes?.medical_notes ?? ""} placeholder="Relevant medical information..." />
              </FormField>
            </FormSection>

            <FormSection icon={Heart} title="Additional Notes" accentColor="teal">
              <FormField label="Guardianship Notes">
                <Textarea name="guardianship_notes" rows={2} className={textareaStyles} defaultValue={notes?.guardianship_notes ?? ""} placeholder="Guardianship arrangements..." />
              </FormField>
              <FormField label="Additional Remarks">
                <Textarea name="additional_remarks" rows={2} className={textareaStyles} defaultValue={notes?.additional_remarks ?? ""} placeholder="Any other notes..." />
              </FormField>
            </FormSection>
          </div>

          <div className="border-t border-border bg-muted/50 px-6 py-4">
            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending} className="text-muted-foreground hover:text-foreground">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="min-w-[140px] gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-200">
                {isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
                ) : (
                  <><Check className="h-4 w-4" />{isEdit ? "Save Changes" : "Add Notes"}</>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
