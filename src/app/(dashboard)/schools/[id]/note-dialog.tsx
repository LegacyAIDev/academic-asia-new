"use client"

import { DialogCloseButton } from "@/components/forms/dialog-close-button"
import { FormField } from "@/components/forms/form-field"
import { ConfirmDeleteButton } from "@/components/features/confirm-delete-button"
import { useRef, useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  Loader2,
  Pencil,
  StickyNote,
  Tag,
  FileText,
  Check,
  Paperclip,
} from "lucide-react"
import type { SchoolNoteWithJoins } from "@/lib/supabase/queries/school-notes"
import { AttachmentField, type AttachmentFieldHandle } from "@/components/features/attachment-field"
import type { AttachmentRecord } from "@/lib/supabase/queries/record-attachments"
import {
  createSchoolNote,
  updateSchoolNote,
  deleteSchoolNote,
  type CreateSchoolNoteInput,
} from "@/lib/supabase/actions/school-notes"
import { FormSection } from "@/components/forms/form-section"
import { useAddParam } from "@/lib/students/use-add-param"

type CategoryItem = { id: number; code: string; label: string }
export type NoteReferenceData = { categories: CategoryItem[] }

type NoteDialogProps = {
  schoolId: string
  referenceData: NoteReferenceData
  mode: "create" | "edit"
  note?: SchoolNoteWithJoins
  trigger?: React.ReactNode
  attachments?: AttachmentRecord[]
  canWrite?: boolean
}


export function NoteDialog({
  schoolId,
  referenceData,
  mode,
  note,
  trigger,
  attachments = [],
  canWrite = true,
}: NoteDialogProps) {
  const [open, setOpen] = useAddParam(mode === "create" ? "note" : null)
  const attachRef = useRef<AttachmentFieldHandle>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const { categories } = referenceData

  const handleOpenChange = (value: boolean) => {
    setOpen(value)
    if (value) setError(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    const input: Omit<CreateSchoolNoteInput, "school_id"> = {
      category_id: formData.get("category_id")
        ? parseInt(formData.get("category_id") as string, 10)
        : null,
      detail: (formData.get("detail") as string) || null,
    }

    startTransition(async () => {
      let result
      if (mode === "create") {
        result = await createSchoolNote({ ...input, school_id: schoolId } as CreateSchoolNoteInput)
        // Staged attachments could not be linked before the row existed.
        if (result?.success && result.data?.id) {
          const failed = await attachRef.current?.flush(result.data.id) ?? 0
          if (failed > 0) setError(`Saved, but ${failed} attachment(s) failed to upload`)
        }
      } else if (note?.id) {
        result = await updateSchoolNote(note.id, schoolId, input)
      }

      if (result?.success) setOpen(false)
      else setError(result?.error ?? "An error occurred")
    })
  }

  const selectTriggerStyles = "h-10 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add note
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:!max-w-[560px] !max-h-[92vh] !overflow-hidden !p-0 !gap-0 bg-background flex flex-col" showCloseButton={false}>
        <div className="relative shrink-0 border-b border-border">
          <div className="relative flex items-center gap-3 px-6 py-4">
            <div className="relative">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-md bg-brand-navy/[0.07] text-brand-navy">
                <StickyNote className="h-5 w-5" />
              </div>
            </div>
            <DialogHeader className="flex-1 space-y-1">
              <DialogTitle className="text-lg font-semibold">
                {mode === "create" ? "New Note" : "Edit Note"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {mode === "create" ? "Add a note to this school" : "Update note details"}
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

            <FormSection icon={StickyNote} title="Note Details" accentColor="primary">
              <FormField label="Category *">
                <Select name="category_id" defaultValue={note?.category_id?.toString() ?? ""} required>
                  <SelectTrigger className={selectTriggerStyles}><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        <span className="flex items-center gap-2">
                          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                          {c.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </FormSection>

            <FormSection icon={Paperclip} title="Attachments" accentColor="rose">
              <FormField label="Attachment (file or link)">
                <AttachmentField
                  ref={attachRef}
                  attachPoint="school_note"
                  ownerId={schoolId}
                  attachableId={mode === "edit" ? note?.id ?? null : null}
                  attachments={attachments}
                  canWrite={canWrite}
                />
              </FormField>
            </FormSection>

            <FormSection icon={FileText} title="Content" accentColor="teal">
              <FormField label="Detail *">
                <Textarea name="detail" rows={8} required className="resize-none bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" defaultValue={note?.detail ?? ""} placeholder="Enter note content..." />
              </FormField>
            </FormSection>
          </div>

          <div className="shrink-0 border-t border-border bg-muted/40 px-6 py-3">
            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending} className="text-muted-foreground hover:text-foreground">Cancel</Button>
              <Button type="submit" disabled={isPending} className="min-w-[140px] gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-200">
                {isPending ? (<><Loader2 className="h-4 w-4 animate-spin" />{mode === "create" ? "Creating..." : "Saving..."}</>) : (<>{mode === "create" ? <Plus className="h-4 w-4" /> : <Check className="h-4 w-4" />}{mode === "create" ? "Create Note" : "Save Changes"}</>)}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function EditNoteButton({ note, schoolId, referenceData, attachments = [], canWrite = true }: { note: SchoolNoteWithJoins; schoolId: string; referenceData: NoteReferenceData; attachments?: AttachmentRecord[]; canWrite?: boolean }) {
  return (
    <NoteDialog schoolId={schoolId} referenceData={referenceData} mode="edit" note={note} attachments={attachments} canWrite={canWrite}
      trigger={<Button aria-label="Edit" title="Edit" variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"><Pencil className="h-3.5 w-3.5" /></Button>}
    />
  )
}

export function DeleteNoteButton({ noteId, schoolId, label }: { noteId: string; schoolId: string; label: string }) {
  return (
    <ConfirmDeleteButton
      title="Delete Note"
      description={<>Are you sure you want to delete the note for <strong className="text-foreground">{label}</strong>? This action cannot be undone.</>}
      failMessage="Failed to delete note"
      onDelete={() => deleteSchoolNote(noteId, schoolId)}
    />
  )
}
