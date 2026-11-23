"use client"

import { DialogCloseButton } from "@/components/forms/dialog-close-button"
import { FormField } from "@/components/forms/form-field"
import { ConfirmDeleteButton } from "@/components/features/confirm-delete-button"
import { useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus,
  Loader2,
  Pencil,
  CalendarSearch,
  FileText,
  MessageSquare,
  Check,
} from "lucide-react"
import {
  createSchoolVisit,
  updateSchoolVisit,
  deleteSchoolVisit,
  type CreateSchoolVisitInput,
} from "@/lib/supabase/actions/school-visits"
import type { SchoolVisitWithJoins } from "@/lib/supabase/queries/school-visits"
import { FormSection } from "@/components/forms/form-section"
import { useAddParam } from "@/lib/students/use-add-param"

type VisitDialogProps = {
  schoolId: string
  mode: "create" | "edit"
  visit?: SchoolVisitWithJoins
  trigger?: React.ReactNode
}


export function SchoolVisitDialog({ schoolId, mode, visit, trigger }: VisitDialogProps) {
  const [open, setOpen] = useAddParam(mode === "create" ? "visit" : null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleOpenChange = (value: boolean) => {
    setOpen(value)
    if (value) setError(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    const input: Omit<CreateSchoolVisitInput, "school_id"> = {
      visit_date: (formData.get("visit_date") as string) || null,
      school_contact: (formData.get("school_contact") as string) || null,
      visit_log: (formData.get("visit_log") as string) || null,
      result: (formData.get("result") as string) || null,
      remarks: (formData.get("remarks") as string) || null,
    }

    startTransition(async () => {
      let result
      if (mode === "create") {
        result = await createSchoolVisit({ ...input, school_id: schoolId } as CreateSchoolVisitInput)
      } else if (visit?.id) {
        result = await updateSchoolVisit(visit.id, schoolId, input)
      }
      if (result?.success) setOpen(false)
      else setError(result?.error ?? "An error occurred")
    })
  }

  const inputStyles = "h-10 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add visit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:!max-w-[580px] !max-h-[92vh] !overflow-hidden !p-0 !gap-0 bg-background flex flex-col" showCloseButton={false}>
        <div className="relative shrink-0 border-b border-border">
          <div className="relative flex items-center gap-3 px-6 py-4">
            <div className="relative">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-md bg-brand-navy/[0.07] text-brand-navy">
                <CalendarSearch className="h-5 w-5" />
              </div>
            </div>
            <DialogHeader className="flex-1 space-y-1">
              <DialogTitle className="text-lg font-semibold">
                {mode === "create" ? "Log Visit" : "Edit Visit"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {mode === "create" ? "Record a school visit" : "Update visit details"}
              </p>
            </DialogHeader>
            <DialogCloseButton onClick={() => setOpen(false)} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive animate-in slide-in-from-top-2 duration-300">
                <span className="font-medium">{error}</span>
              </div>
            )}

            <FormSection icon={CalendarSearch} title="Visit Details" accentColor="primary">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Visit Date">
                  <Input name="visit_date" type="date" className={inputStyles} defaultValue={visit?.visit_date ?? ""} />
                </FormField>
                <FormField label="School Contact">
                  <Input name="school_contact" className={inputStyles} defaultValue={visit?.school_contact ?? ""} placeholder="Person met at school" />
                </FormField>
              </div>
            </FormSection>

            <FormSection icon={FileText} title="Visit Log" accentColor="teal">
              <FormField label="Visit Log">
                <Textarea name="visit_log" rows={4} className="resize-none bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" defaultValue={visit?.visit_log ?? ""} placeholder="Activities and observations during the visit..." />
              </FormField>
              <FormField label="Result">
                <Input name="result" className={inputStyles} defaultValue={visit?.result ?? ""} placeholder="Visit outcome" />
              </FormField>
            </FormSection>

            <FormSection icon={MessageSquare} title="Remarks" accentColor="rose">
              <FormField label="Remarks">
                <Textarea name="remarks" rows={3} className="resize-none bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" defaultValue={visit?.remarks ?? ""} placeholder="Additional notes..." />
              </FormField>
            </FormSection>
          </div>

          <div className="shrink-0 border-t border-border bg-muted/40 px-6 py-3">
            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending} className="text-muted-foreground hover:text-foreground">Cancel</Button>
              <Button type="submit" disabled={isPending} className="min-w-[140px] gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-200">
                {isPending ? (<><Loader2 className="h-4 w-4 animate-spin" />{mode === "create" ? "Creating..." : "Saving..."}</>) : (<>{mode === "create" ? <Plus className="h-4 w-4" /> : <Check className="h-4 w-4" />}{mode === "create" ? "Log Visit" : "Save Changes"}</>)}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function EditSchoolVisitButton({ visit, schoolId }: { visit: SchoolVisitWithJoins; schoolId: string }) {
  return (
    <SchoolVisitDialog schoolId={schoolId} mode="edit" visit={visit}
      trigger={<Button aria-label="Edit" title="Edit" variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"><Pencil className="h-3.5 w-3.5" /></Button>}
    />
  )
}

export function DeleteSchoolVisitButton({ visitId, schoolId, label }: { visitId: string; schoolId: string; label: string }) {
  return (
    <ConfirmDeleteButton
      title="Delete Visit"
      description={<>Are you sure you want to delete the visit from <strong className="text-foreground">{label}</strong>? This action cannot be undone.</>}
      failMessage="Failed to delete"
      onDelete={() => deleteSchoolVisit(visitId, schoolId)}
    />
  )
}
