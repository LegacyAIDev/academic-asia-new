"use client"

import { useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Trash2,
  FileText,
  Music,
  Award,
  MessageSquare,
  Check,
} from "lucide-react"
import {
  createStudentResume,
  updateStudentResume,
  deleteStudentResume,
  type CreateResumeInput,
} from "@/lib/supabase/actions/student-resume"
import type { ResumeWithJoins } from "@/lib/supabase/queries/student-resume"

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
}

function FormSection({
  icon: Icon,
  title,
  children,
  accentColor = "primary",
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
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

function FormField({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

export function ResumeDialog({
  studentId,
  referenceData,
  mode,
  resume,
  trigger,
}: ResumeDialogProps) {
  const [open, setOpen] = useState(false)
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
          <Button size="sm" className="gap-2 shadow-sm bg-primary hover:bg-primary/90 transition-all duration-200">
            <Plus className="h-4 w-4" />
            New Resume
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="sm:!max-w-[600px] max-h-[92vh] overflow-hidden p-0 gap-0 bg-background"
        showCloseButton={false}
      >
        <div className="relative overflow-hidden border-b border-border/50">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-60" />
          <div className="relative flex items-center gap-4 px-6 py-5">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25">
                <FileText className="h-5 w-5" />
              </div>
            </div>
            <DialogHeader className="flex-1 space-y-1">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {mode === "create" ? "New Resume Entry" : "Edit Resume Entry"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {mode === "create" ? "Add a music audition or school record" : "Update resume entry details"}
              </p>
            </DialogHeader>
            <button
              onClick={() => setOpen(false)}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
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

          <div className="border-t border-border bg-muted/50 px-6 py-4">
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
}: {
  resume: ResumeWithJoins
  studentId: string
  referenceData: ResumeReferenceData
}) {
  return (
    <ResumeDialog
      studentId={studentId}
      referenceData={referenceData}
      mode="edit"
      resume={resume}
      trigger={
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
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
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = () => {
    setError(null)
    startTransition(async () => {
      const result = await deleteStudentResume(resumeId, studentId)
      if (result.success) {
        setOpen(false)
      } else {
        setError(result.error ?? "Failed to delete resume entry")
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      <AlertDialogContent className="sm:max-w-[420px]">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destructive/10">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <div className="space-y-1.5">
              <AlertDialogTitle className="text-lg">Delete Resume Entry</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the resume entry for <strong className="text-foreground">{resumeLabel}</strong>?
                This action cannot be undone.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel disabled={isPending} className="rounded-lg">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
