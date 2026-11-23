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
import { Input } from "@/components/ui/input"
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
  FileText,
  Music,
  Award,
  MessageSquare,
  Check,
  Paperclip,
} from "lucide-react"
import {
  createStudentResume,
  updateStudentResume,
  deleteStudentResume,
  type CreateResumeInput,
} from "@/lib/supabase/actions/student-resume"
import type { ResumeWithJoins } from "@/lib/supabase/queries/student-resume"
import { AttachmentField, type AttachmentFieldHandle } from "@/components/features/attachment-field"
import type { AttachmentRecord } from "@/lib/supabase/queries/record-attachments"
import { FormSection } from "@/components/forms/form-section"
import { useAddParam } from "@/lib/students/use-add-param"

type ResumeTypeItem = { id: number; code: string; label: string }
type InstrumentItem = { id: number; code: string; label: string; category: string | null }

export type ResumeReferenceData = {
  resumeTypes: ResumeTypeItem[]
  instruments: InstrumentItem[]
}

type ResumeDialogProps = {
  studentId: string
  referenceData: ResumeReferenceData
  mode: "create" | "edit"
  resume?: ResumeWithJoins
  trigger?: React.ReactNode
  attachments?: AttachmentRecord[]
  canWrite?: boolean
}


export function ResumeDialog({
  studentId,
  referenceData,
  mode,
  resume,
  trigger,
  attachments = [],
  canWrite = true,
}: ResumeDialogProps) {
  const [open, setOpen] = useAddParam(mode === "create" ? "resume" : null)
  const attachRef = useRef<AttachmentFieldHandle>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const { resumeTypes, instruments } = referenceData

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    const input: Omit<CreateResumeInput, 'student_id'> = {
      resume_type_id: formData.get("resume_type_id") ? parseInt(formData.get("resume_type_id") as string, 10) : null,
      exam_school: (formData.get("exam_school") as string) || null,
      instrument_id: formData.get("instrument_id") ? parseInt(formData.get("instrument_id") as string, 10) : null,
      subject: (formData.get("subject") as string) || null,
      result: (formData.get("result") as string) || null,
      qualification: (formData.get("qualification") as string) || null,
      piece: (formData.get("piece") as string) || null,
      composer: (formData.get("composer") as string) || null,
      priority: formData.get("priority") ? parseInt(formData.get("priority") as string, 10) : null,
      event_name: (formData.get("event_name") as string) || null,
      remarks: (formData.get("remarks") as string) || null,
    }

    startTransition(async () => {
      let result
      if (mode === "create") {
        result = await createStudentResume({ ...input, student_id: studentId } as CreateResumeInput)
        // Staged attachments could not be linked before the row existed.
        if (result?.success && result.data?.id) {
          const failed = await attachRef.current?.flush(result.data.id) ?? 0
          if (failed > 0) setError(`Saved, but ${failed} attachment(s) failed to upload`)
        }
      } else if (resume?.id) {
        result = await updateStudentResume(resume.id, studentId, input)
      }

      if (result?.success) {
        setOpen(false)
      } else {
        setError(result?.error ?? "An error occurred")
      }
    })
  }

  const inputStyles = "h-10 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
  const selectTriggerStyles = "h-10 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add resume entry
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="sm:!max-w-[600px] !max-h-[92vh] !overflow-hidden !p-0 !gap-0 bg-background flex flex-col"
        showCloseButton={false}
      >
        <div className="relative shrink-0 border-b border-border">
          <div className="relative flex items-center gap-3 px-6 py-4">
            <div className="relative">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-md bg-brand-navy/[0.07] text-brand-navy">
                <FileText className="h-5 w-5" />
              </div>
            </div>
            <DialogHeader className="flex-1 space-y-1">
              <DialogTitle className="text-lg font-semibold">
                {mode === "create" ? "New Resume Entry" : "Edit Resume Entry"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {mode === "create" ? "Add a music audition or school record" : "Update resume entry details"}
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

            <FormSection icon={FileText} title="Type & School" accentColor="primary">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Resume Type">
                  <Select name="resume_type_id" defaultValue={resume?.resume_type_id?.toString() ?? ""}>
                    <SelectTrigger className={selectTriggerStyles}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {resumeTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id.toString()}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Exam School">
                  <Input name="exam_school" className={inputStyles} defaultValue={resume?.exam_school ?? ""} placeholder="School name" />
                </FormField>
              </div>
            </FormSection>

            <FormSection icon={Music} title="Music Details" accentColor="teal">
              <FormField label="Instrument">
                <Select name="instrument_id" defaultValue={resume?.instrument_id?.toString() ?? ""}>
                  <SelectTrigger className={selectTriggerStyles}>
                    <SelectValue placeholder="Select instrument" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {instruments.map((i) => (
                      <SelectItem key={i.id} value={i.id.toString()}>
                        {i.label} {i.category ? `(${i.category})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Subject">
                <Input name="subject" className={inputStyles} defaultValue={resume?.subject ?? ""} placeholder="Subject" />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Piece">
                  <Input name="piece" className={inputStyles} defaultValue={resume?.piece ?? ""} placeholder="Name of piece" />
                </FormField>
                <FormField label="Composer">
                  <Input name="composer" className={inputStyles} defaultValue={resume?.composer ?? ""} placeholder="Composer name" />
                </FormField>
              </div>
            </FormSection>

            <FormSection icon={Award} title="Results & Qualification" accentColor="amber">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Result">
                  <Input name="result" className={inputStyles} defaultValue={resume?.result ?? ""} placeholder="Result" />
                </FormField>
                <FormField label="Priority">
                  <Input name="priority" type="number" className={inputStyles} defaultValue={resume?.priority?.toString() ?? ""} placeholder="0" />
                </FormField>
              </div>
              <FormField label="Qualification">
                <Input name="qualification" className={inputStyles} defaultValue={resume?.qualification ?? ""} placeholder='e.g. "ABRSM G8", "Trinity Grade 5"' />
              </FormField>
            </FormSection>

            <FormSection icon={Paperclip} title="Attachments" accentColor="rose">
              <FormField label="Certificate (file or link)">
                <AttachmentField
                  ref={attachRef}
                  attachPoint="student_qualification"
                  ownerId={studentId}
                  attachableId={mode === "edit" ? resume?.id ?? null : null}
                  attachments={attachments}
                  canWrite={canWrite}
                />
              </FormField>
            </FormSection>

            <FormSection icon={MessageSquare} title="Event & Remarks" accentColor="rose">
              <FormField label="Event Name">
                <Input name="event_name" className={inputStyles} defaultValue={resume?.event_name ?? ""} placeholder="Event name" />
              </FormField>
              <FormField label="Remarks">
                <Textarea
                  name="remarks"
                  rows={3}
                  className="resize-none bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                  defaultValue={resume?.remarks ?? ""}
                  placeholder="Additional notes..."
                />
              </FormField>
            </FormSection>
          </div>

          <div className="shrink-0 border-t border-border bg-muted/40 px-6 py-3">
            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending} className="text-muted-foreground hover:text-foreground">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="min-w-[140px] gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-200">
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {mode === "create" ? "Creating..." : "Saving..."}
                  </>
                ) : (
                  <>
                    {mode === "create" ? <Plus className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    {mode === "create" ? "Create Entry" : "Save Changes"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Edit button for existing resume entries */
export function EditResumeButton({
  resume,
  studentId,
  referenceData,
  attachments = [],
  canWrite = true,
}: {
  resume: ResumeWithJoins
  studentId: string
  referenceData: ResumeReferenceData
  attachments?: AttachmentRecord[]
  canWrite?: boolean
}) {
  return (
    <ResumeDialog
      studentId={studentId}
      referenceData={referenceData}
      mode="edit"
      resume={resume}
      attachments={attachments}
      canWrite={canWrite}
      trigger={
        <Button aria-label="Edit" title="Edit" variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      }
    />
  )
}

/** Delete resume entry with confirmation */
export function DeleteResumeButton({
  resumeId,
  studentId,
  resumeLabel,
}: {
  resumeId: string
  studentId: string
  resumeLabel: string
}) {
  return (
    <ConfirmDeleteButton
      title="Delete Resume Entry"
      description={<>Are you sure you want to delete the resume entry for <strong className="text-foreground">{resumeLabel}</strong>? This action cannot be undone.</>}
      failMessage="Failed to delete resume entry"
      onDelete={() => deleteStudentResume(resumeId, studentId)}
    />
  )
}
