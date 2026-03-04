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
  ClipboardCheck,
  BookOpen,
  Clock,
  MessageSquare,
  Check,
} from "lucide-react"
import type { SchoolEntranceExamWithJoins } from "@/lib/supabase/queries/school-entrance-exams"
import {
  createSchoolEntranceExam,
  updateSchoolEntranceExam,
  deleteSchoolEntranceExam,
  type CreateSchoolEntranceExamInput,
} from "@/lib/supabase/actions/school-entrance-exams"

type ExamTypeItem = { id: number; code: string; label: string }

export type EntranceExamReferenceData = {
  examTypes: ExamTypeItem[]
}

type EntranceExamDialogProps = {
  schoolId: string
  referenceData: EntranceExamReferenceData
  mode: "create" | "edit"
  exam?: SchoolEntranceExamWithJoins
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

function FormField({
  label,
  children,
  className = "",
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

export function EntranceExamDialog({
  schoolId,
  referenceData,
  mode,
  exam,
  trigger,
}: EntranceExamDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const { examTypes } = referenceData

  const handleOpenChange = (value: boolean) => {
    setOpen(value)
    if (value) setError(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    const input: Omit<CreateSchoolEntranceExamInput, "school_id"> = {
      entry_year: (formData.get("entry_year") as string) || null,
      exam_type_id: formData.get("exam_type_id")
        ? parseInt(formData.get("exam_type_id") as string, 10)
        : null,
      year_level: (formData.get("year_level") as string) || null,
      subject: (formData.get("subject") as string) || null,
      duration_minutes: formData.get("duration_minutes")
        ? parseInt(formData.get("duration_minutes") as string, 10)
        : null,
      exam_format: (formData.get("exam_format") as string) || null,
      has_paper: formData.get("has_paper") === "true",
      remarks: (formData.get("remarks") as string) || null,
      aa_remarks: (formData.get("aa_remarks") as string) || null,
    }

    startTransition(async () => {
      let result
      if (mode === "create") {
        result = await createSchoolEntranceExam({ ...input, school_id: schoolId })
      } else if (exam?.id) {
        result = await updateSchoolEntranceExam(exam.id, schoolId, input)
      }

      if (result?.success) setOpen(false)
      else setError(result?.error ?? "An error occurred")
    })
  }

  const inputStyles = "h-10 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
  const selectTriggerStyles = "h-10 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-2 shadow-sm bg-primary hover:bg-primary/90 transition-all duration-200">
            <Plus className="h-4 w-4" />
            New Entrance Exam
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:!max-w-[560px] max-h-[92vh] overflow-hidden p-0 gap-0 bg-background" showCloseButton={false}>
        <div className="relative overflow-hidden border-b border-border/50">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-60" />
          <div className="relative flex items-center gap-4 px-6 py-5">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25">
                <ClipboardCheck className="h-5 w-5" />
              </div>
            </div>
            <DialogHeader className="flex-1 space-y-1">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {mode === "create" ? "New Entrance Exam" : "Edit Entrance Exam"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {mode === "create" ? "Add an entrance exam to this school" : "Update entrance exam details"}
              </p>
            </DialogHeader>
            <button onClick={() => setOpen(false)} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
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

            <FormSection icon={BookOpen} title="Exam Details" accentColor="primary">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Entry Year *">
                  <Input name="entry_year" required className={inputStyles} defaultValue={exam?.entry_year ?? ""} placeholder="e.g. 2024-25" />
                </FormField>
                <FormField label="Year Level *">
                  <Input name="year_level" required className={inputStyles} defaultValue={exam?.year_level ?? ""} placeholder="e.g. Year 12" />
                </FormField>
              </div>
              <FormField label="Exam Type *">
                <Select name="exam_type_id" required defaultValue={exam?.exam_type_id?.toString() ?? ""}>
                  <SelectTrigger className={selectTriggerStyles}><SelectValue placeholder="Select exam type" /></SelectTrigger>
                  <SelectContent>
                    {examTypes.map((et) => (<SelectItem key={et.id} value={et.id.toString()}>{et.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Subject *">
                <Input name="subject" required className={inputStyles} defaultValue={exam?.subject ?? ""} placeholder="e.g. Mathematics" />
              </FormField>
            </FormSection>

            <FormSection icon={Clock} title="Format & Duration" accentColor="teal">
              <FormField label="Duration in Minutes">
                <Input name="duration_minutes" type="number" min={1} className={inputStyles} defaultValue={exam?.duration_minutes ?? ""} placeholder="e.g. 60" />
              </FormField>
              <FormField label="Exam Format / Instructions">
                <Textarea name="exam_format" rows={3} className="resize-none bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" defaultValue={exam?.exam_format ?? ""} placeholder="e.g. Calculator allowed..." />
              </FormField>
              <FormField label="Has Paper">
                <Select name="has_paper" defaultValue={exam?.has_paper ? "true" : "false"}>
                  <SelectTrigger className={selectTriggerStyles}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">No</SelectItem>
                    <SelectItem value="true">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </FormSection>

            <FormSection icon={MessageSquare} title="Remarks" accentColor="rose">
              <FormField label="Remarks">
                <Textarea name="remarks" rows={3} className="resize-none bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" defaultValue={exam?.remarks ?? ""} placeholder="General remarks about this exam..." />
              </FormField>
              <FormField label="AA Remarks">
                <Textarea name="aa_remarks" rows={3} className="resize-none bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" defaultValue={exam?.aa_remarks ?? ""} placeholder="Internal AA remarks..." />
              </FormField>
            </FormSection>
          </div>

          <div className="border-t border-border bg-muted/50 px-6 py-4">
            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending} className="text-muted-foreground hover:text-foreground">Cancel</Button>
              <Button type="submit" disabled={isPending} className="min-w-[140px] gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-200">
                {isPending ? (<><Loader2 className="h-4 w-4 animate-spin" />{mode === "create" ? "Creating..." : "Saving..."}</>) : (<>{mode === "create" ? <Plus className="h-4 w-4" /> : <Check className="h-4 w-4" />}{mode === "create" ? "Create Exam" : "Save Changes"}</>)}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function EditEntranceExamButton({ exam, schoolId, referenceData }: { exam: SchoolEntranceExamWithJoins; schoolId: string; referenceData: EntranceExamReferenceData }) {
  return (
    <EntranceExamDialog schoolId={schoolId} referenceData={referenceData} mode="edit" exam={exam}
      trigger={<Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"><Pencil className="h-3.5 w-3.5" /></Button>}
    />
  )
}

export function DeleteEntranceExamButton({ examId, schoolId, label }: { examId: string; schoolId: string; label: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = () => {
    setError(null)
    startTransition(async () => {
      const result = await deleteSchoolEntranceExam(examId, schoolId)
      if (result.success) setOpen(false)
      else setError(result.error ?? "Failed to delete entrance exam")
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" onClick={() => setOpen(true)}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      <AlertDialogContent className="sm:max-w-[420px]">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destructive/10"><Trash2 className="h-5 w-5 text-destructive" /></div>
            <div className="space-y-1.5">
              <AlertDialogTitle className="text-lg">Delete Entrance Exam</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to delete the entrance exam for <strong className="text-foreground">{label}</strong>? This action cannot be undone.</AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel disabled={isPending} className="rounded-lg">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending} className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2">
            {isPending ? (<><Loader2 className="h-4 w-4 animate-spin" />Deleting...</>) : (<><Trash2 className="h-4 w-4" />Delete</>)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
