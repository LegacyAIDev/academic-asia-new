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
  BookOpen,
  Calendar,
  ClipboardList,
  MessageSquare,
  Check,
} from "lucide-react"
import {
  createStudentEducation,
  updateStudentEducation,
  deleteStudentEducation,
  type CreateEducationInput,
} from "@/lib/supabase/actions/student-education"
import type { EducationWithJoins } from "@/lib/supabase/queries/student-education"

type CourseItem = { id: number; code: string; label: string; category: string | null }
type StatusItem = { id: number; code: string; label: string }

export type EducationReferenceData = {
  courses: CourseItem[]
  statuses: StatusItem[]
}

type EducationDialogProps = {
  studentId: string
  referenceData: EducationReferenceData
  mode: "create" | "edit"
  education?: EducationWithJoins
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

export function EducationDialog({
  studentId,
  referenceData,
  mode,
  education,
  trigger,
}: EducationDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const { courses, statuses } = referenceData

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    const input: Omit<CreateEducationInput, 'student_id'> = {
      course_id: formData.get("course_id") ? parseInt(formData.get("course_id") as string, 10) : null,
      tutor: (formData.get("tutor") as string) || null,
      start_date: (formData.get("start_date") as string) || null,
      end_date: (formData.get("end_date") as string) || null,
      total_hours: (formData.get("total_hours") as string) || null,
      status_id: formData.get("status_id") ? parseInt(formData.get("status_id") as string, 10) : null,
      email_sent: formData.get("email_sent") === "true",
      remarks: (formData.get("remarks") as string) || null,
    }

    startTransition(async () => {
      let result
      if (mode === "create") {
        result = await createStudentEducation({ ...input, student_id: studentId } as CreateEducationInput)
      } else if (education?.id) {
        result = await updateStudentEducation(education.id, studentId, input)
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
            New Education
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="sm:!max-w-[560px] max-h-[92vh] overflow-hidden p-0 gap-0 bg-background"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="relative overflow-hidden border-b border-border/50">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-60" />

          <div className="relative flex items-center gap-4 px-6 py-5">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25">
                <BookOpen className="h-5 w-5" />
              </div>
            </div>

            <DialogHeader className="flex-1 space-y-1">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {mode === "create" ? "New Education Entry" : "Edit Education Entry"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {mode === "create"
                  ? "Add a tutoring or prep program enrollment"
                  : "Update education entry details"}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive animate-in slide-in-from-top-2 duration-300">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <span className="font-medium">{error}</span>
              </div>
            )}

            <FormSection icon={BookOpen} title="Course & Tutor" accentColor="primary">
              <FormField label="Course">
                <Select name="course_id" defaultValue={education?.course_id?.toString() ?? ""}>
                  <SelectTrigger className={selectTriggerStyles}>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Tutor">
                <Input name="tutor" className={inputStyles} defaultValue={education?.tutor ?? ""} placeholder="Tutor name" />
              </FormField>
            </FormSection>

            <FormSection icon={Calendar} title="Schedule" accentColor="teal">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Start Date">
                  <Input name="start_date" type="date" className={inputStyles} defaultValue={education?.start_date ?? ""} />
                </FormField>
                <FormField label="End Date">
                  <Input name="end_date" type="date" className={inputStyles} defaultValue={education?.end_date ?? ""} />
                </FormField>
              </div>
              <FormField label="Total Hours">
                <Input name="total_hours" className={inputStyles} defaultValue={education?.total_hours ?? ""} placeholder='e.g. "10 hours", "2 weeks"' />
              </FormField>
            </FormSection>

            <FormSection icon={ClipboardList} title="Status & Communication" accentColor="amber">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Status">
                  <Select name="status_id" defaultValue={education?.status_id?.toString() ?? "1"}>
                    <SelectTrigger className={selectTriggerStyles}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Email Sent">
                  <Select name="email_sent" defaultValue={education?.email_sent ? "true" : "false"}>
                    <SelectTrigger className={selectTriggerStyles}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">No</SelectItem>
                      <SelectItem value="true">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            </FormSection>

            <FormSection icon={MessageSquare} title="Remarks" accentColor="rose">
              <FormField label="Remarks">
                <Textarea
                  name="remarks"
                  rows={4}
                  className="resize-none bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                  defaultValue={education?.remarks ?? ""}
                  placeholder="Notes about this education entry..."
                />
              </FormField>
            </FormSection>
          </div>

          {/* Footer */}
          <div className="border-t border-border bg-muted/50 px-6 py-4">
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="min-w-[140px] gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-200"
              >
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

/** Edit button for existing education entries */
export function EditEducationButton({
  education,
  studentId,
  referenceData,
}: {
  education: EducationWithJoins
  studentId: string
  referenceData: EducationReferenceData
}) {
  return (
    <EducationDialog
      studentId={studentId}
      referenceData={referenceData}
      mode="edit"
      education={education}
      trigger={
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      }
    />
  )
}

/** Delete education entry dialog */
export function DeleteEducationButton({
  educationId,
  studentId,
  courseName,
}: {
  educationId: string
  studentId: string
  courseName: string
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = () => {
    setError(null)
    startTransition(async () => {
      const result = await deleteStudentEducation(educationId, studentId)
      if (result.success) {
        setOpen(false)
      } else {
        setError(result.error ?? "Failed to delete education entry")
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
              <AlertDialogTitle className="text-lg">Delete Education Entry</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the education entry for <strong className="text-foreground">{courseName}</strong>?
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
