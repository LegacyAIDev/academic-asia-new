"use client"

import { useRef, useState, useMemo, useTransition } from "react"
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
  FileCheck,
  GraduationCap,
  ClipboardList,
  MessageSquare,
  Check,
  Paperclip,
} from "lucide-react"
import {
  createStudentExamResult,
  updateStudentExamResult,
  deleteStudentExamResult,
  type CreateExamResultInput,
} from "@/lib/supabase/actions/student-exam-results"
import type { ExamResultWithJoins } from "@/lib/supabase/queries/student-exam-results"
import { AttachmentField, type AttachmentFieldHandle } from "@/components/features/attachment-field"
import type { AttachmentRecord } from "@/lib/supabase/queries/record-attachments"
import { SchoolSearchField } from "@/components/features/school-search-field"
import { FormSection } from "@/components/forms/form-section"
import { useAddParam } from "@/lib/students/use-add-param"
import { DateField } from "@/components/ui/date-field"

type ExamTypeItem = { id: number; code: string; label: string }
type SubjectItem = { id: number; code: string; label: string; exam_type_code: string | null }
type PaperItem = { id: number; code: string; label: string }
type StatusItem = { id: number; code: string; label: string }

export type ExamResultReferenceData = {
  examTypes: ExamTypeItem[]
  subjects: SubjectItem[]
  papers: PaperItem[]
  statuses: StatusItem[]
}

type ExamResultDialogProps = {
  studentId: string
  referenceData: ExamResultReferenceData
  mode: "create" | "edit"
  examResult?: ExamResultWithJoins
  trigger?: React.ReactNode
  attachments?: AttachmentRecord[]
  canWrite?: boolean
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

export function ExamResultDialog({
  studentId,
  referenceData,
  mode,
  examResult,
  trigger,
  attachments = [],
  canWrite = true,
}: ExamResultDialogProps) {
  const [open, setOpen] = useAddParam(mode === "create" ? "exam-result" : null)
  const attachRef = useRef<AttachmentFieldHandle>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Derive initial exam type from the existing result
  const initialExamTypeId = examResult?.exam_type?.code ?? ""
  const [selectedExamTypeCode, setSelectedExamTypeCode] = useState(initialExamTypeId)

  const { examTypes, subjects, papers, statuses } = referenceData

  // Filter subjects by selected exam type code
  const filteredSubjects = useMemo(() => {
    if (!selectedExamTypeCode) return subjects
    return subjects.filter((s) => s.exam_type_code === selectedExamTypeCode)
  }, [selectedExamTypeCode, subjects])

  // Map exam type id → code for the cascade
  const examTypeIdToCode = useMemo(() => {
    const m: Record<string, string> = {}
    examTypes.forEach((et) => { m[et.id.toString()] = et.code })
    return m
  }, [examTypes])

  const handleOpenChange = (value: boolean) => {
    setOpen(value)
    if (value) {
      setSelectedExamTypeCode(initialExamTypeId)
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    const input: Omit<CreateExamResultInput, 'student_id'> = {
      test_date: (formData.get("test_date") as string) || null,
      school_id: (formData.get("school_id") as string) || null,
      paper_id: formData.get("paper_id") ? parseInt(formData.get("paper_id") as string, 10) : null,
      exam_type_id: formData.get("exam_type_id") ? parseInt(formData.get("exam_type_id") as string, 10) : null,
      subject_id: formData.get("subject_id") ? parseInt(formData.get("subject_id") as string, 10) : null,
      paper_ready: formData.get("paper_ready") === "true",
      score: formData.get("score") ? parseFloat(formData.get("score") as string) : null,
      max_score: formData.get("max_score") ? parseFloat(formData.get("max_score") as string) : null,
      status_id: formData.get("status_id") ? parseInt(formData.get("status_id") as string, 10) : null,
      remarks: (formData.get("remarks") as string) || null,
    }

    startTransition(async () => {
      let result
      if (mode === "create") {
        result = await createStudentExamResult({ ...input, student_id: studentId } as CreateExamResultInput)
        // Staged attachments could not be linked before the row existed.
        if (result?.success && result.data?.id) {
          const failed = await attachRef.current?.flush(result.data.id) ?? 0
          if (failed > 0) setError(`Saved, but ${failed} attachment(s) failed to upload`)
        }
      } else if (examResult?.id) {
        result = await updateStudentExamResult(examResult.id, studentId, input)
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add exam result
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="sm:!max-w-[560px] !max-h-[92vh] !overflow-hidden !p-0 !gap-0 bg-background flex flex-col"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="relative shrink-0 border-b border-border">

          <div className="relative flex items-center gap-3 px-6 py-4">
            <div className="relative">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-md bg-brand-navy/[0.07] text-brand-navy">
                <FileCheck className="h-5 w-5" />
              </div>
            </div>

            <DialogHeader className="flex-1 space-y-1">
              <DialogTitle className="text-lg font-semibold">
                {mode === "create" ? "New Exam Result" : "Edit Exam Result"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {mode === "create"
                  ? "Record a test or exam result"
                  : "Update exam result details"}
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
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
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

            <FormSection icon={FileCheck} title="When and where" accentColor="primary">
              <FormField label="Test date">
                <DateField name="test_date" defaultValue={examResult?.test_date ?? null} />
              </FormField>
              <FormField label="School">
                <SchoolSearchField name="school_id" className={inputStyles} defaultSchool={examResult?.school ?? null} />
              </FormField>
            </FormSection>

            <FormSection icon={GraduationCap} title="Which test" accentColor="teal">
              <FormField label="Paper">
                <Select name="paper_id" defaultValue={examResult?.paper_id?.toString() ?? ""}>
                  <SelectTrigger className={selectTriggerStyles}>
                    <SelectValue placeholder="Select exam paper" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {papers.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Type of test">
                <Select
                  name="exam_type_id"
                  defaultValue={examResult?.exam_type_id?.toString() ?? ""}
                  onValueChange={(val) => {
                    const code = examTypeIdToCode[val] ?? ""
                    setSelectedExamTypeCode(code)
                  }}
                >
                  <SelectTrigger className={selectTriggerStyles}>
                    <SelectValue placeholder="Select test/exam type" />
                  </SelectTrigger>
                  <SelectContent>
                    {examTypes.map((et) => (
                      <SelectItem key={et.id} value={et.id.toString()}>{et.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Subject">
                <Select name="subject_id" defaultValue={examResult?.subject_id?.toString() ?? ""}>
                  <SelectTrigger className={selectTriggerStyles}>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSubjects.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </FormSection>

            <FormSection icon={ClipboardList} title="Result" accentColor="amber">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Paper prepared?">
                  <Select name="paper_ready" defaultValue={examResult?.paper_ready ? "true" : "false"}>
                    <SelectTrigger className={selectTriggerStyles}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">No</SelectItem>
                      <SelectItem value="true">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Status">
                  <Select name="status_id" defaultValue={examResult?.status_id?.toString() ?? "1"}>
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
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Score">
                  <Input name="score" type="number" step="0.01" className={inputStyles} defaultValue={examResult?.score ?? ""} placeholder="e.g. 88" />
                </FormField>
                <FormField label="Out of">
                  <Input name="max_score" type="number" step="0.01" className={inputStyles} defaultValue={examResult?.max_score ?? "100"} placeholder="100" />
                </FormField>
              </div>
            </FormSection>

            <FormSection icon={Paperclip} title="Attachments" accentColor="rose">
              <FormField label="Result document (file or link)">
                <AttachmentField
                  ref={attachRef}
                  attachPoint="student_exam_result"
                  ownerId={studentId}
                  attachableId={mode === "edit" ? examResult?.id ?? null : null}
                  attachments={attachments}
                  canWrite={canWrite}
                />
              </FormField>
            </FormSection>

            <FormSection icon={MessageSquare} title="Remarks" accentColor="rose">
              <FormField label="Remarks">
                <Textarea
                  name="remarks"
                  rows={4}
                  className="resize-none bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                  defaultValue={examResult?.remarks ?? ""}
                  placeholder="Notes about this exam result..."
                />
              </FormField>
            </FormSection>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-border bg-muted/40 px-6 py-3">
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
                    {mode === "create" ? "Create Result" : "Save Changes"}
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

/** Edit button for existing exam results */
export function EditExamResultButton({
  examResult,
  studentId,
  referenceData,
  attachments = [],
  canWrite = true,
}: {
  examResult: ExamResultWithJoins
  studentId: string
  referenceData: ExamResultReferenceData
  attachments?: AttachmentRecord[]
  canWrite?: boolean
}) {
  return (
    <ExamResultDialog
      studentId={studentId}
      referenceData={referenceData}
      mode="edit"
      examResult={examResult}
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

/** Delete exam result dialog */
export function DeleteExamResultButton({
  resultId,
  studentId,
  label,
}: {
  resultId: string
  studentId: string
  label: string
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = () => {
    setError(null)
    startTransition(async () => {
      const result = await deleteStudentExamResult(resultId, studentId)
      if (result.success) {
        setOpen(false)
      } else {
        setError(result.error ?? "Failed to delete exam result")
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button aria-label="Delete" title="Delete"
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
              <AlertDialogTitle className="text-lg">Delete Exam Result</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the exam result for <strong className="text-foreground">{label}</strong>?
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
