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
  School,
  Calendar,
  ClipboardList,
  Award,
  CalendarDays,
  MessageSquare,
  Check,
} from "lucide-react"
import {
  createStudentApplication,
  updateStudentApplication,
  deleteStudentApplication,
  type CreateApplicationInput,
} from "@/lib/supabase/actions/student-applications"
import type { ApplicationWithJoins } from "@/lib/supabase/queries/student-applications"

type ReferenceItem = { id: number; code: string; label: string }
type StatusItem = ReferenceItem & { category: string | null }
type SchoolItem = { id: string; name: string }
type EventItem = { id: string; name: string }
type CourseItem = ReferenceItem & { category: string | null }

export type ApplicationReferenceData = {
  statuses: StatusItem[]
  subStatuses: ReferenceItem[]
  modes: ReferenceItem[]
  schools: SchoolItem[]
  events: EventItem[]
  courses: CourseItem[]
}

type ApplicationDialogProps = {
  studentId: string
  referenceData: ApplicationReferenceData
  mode: "create" | "edit"
  application?: ApplicationWithJoins
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

const MONTHS = [
  { value: "1", label: "Jan" }, { value: "2", label: "Feb" },
  { value: "3", label: "Mar" }, { value: "4", label: "Apr" },
  { value: "5", label: "May" }, { value: "6", label: "Jun" },
  { value: "7", label: "Jul" }, { value: "8", label: "Aug" },
  { value: "9", label: "Sep" }, { value: "10", label: "Oct" },
  { value: "11", label: "Nov" }, { value: "12", label: "Dec" },
]

export function ApplicationDialog({
  studentId,
  referenceData,
  mode,
  application,
  trigger,
}: ApplicationDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const { statuses, subStatuses, modes, schools, events, courses } = referenceData

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    const input: Omit<CreateApplicationInput, 'student_id'> = {
      school_id: formData.get("school_id") as string,
      course_id: formData.get("course_id") ? parseInt(formData.get("course_id") as string, 10) : null,
      course_detail: (formData.get("course_detail") as string) || null,
      entry_year: (formData.get("entry_year") as string) || null,
      course_start_month: formData.get("course_start_month") ? parseInt(formData.get("course_start_month") as string, 10) : null,
      course_start_year: formData.get("course_start_year") ? parseInt(formData.get("course_start_year") as string, 10) : null,
      status_id: formData.get("status_id") ? parseInt(formData.get("status_id") as string, 10) : null,
      sub_status_id: formData.get("sub_status_id") ? parseInt(formData.get("sub_status_id") as string, 10) : null,
      mode_id: formData.get("mode_id") ? parseInt(formData.get("mode_id") as string, 10) : null,
      is_referral: formData.get("is_referral") === "true",
      scholarship_amount: formData.get("scholarship_amount") ? parseFloat(formData.get("scholarship_amount") as string) : null,
      scholarship_detail: (formData.get("scholarship_detail") as string) || null,
      event_id: (formData.get("event_id") as string) || null,
      music_audition: (formData.get("music_audition") as string) || null,
      result_remarks: (formData.get("result_remarks") as string) || null,
      remarks_to_school: (formData.get("remarks_to_school") as string) || null,
      aa_remarks: (formData.get("aa_remarks") as string) || null,
      registration_date: (formData.get("registration_date") as string) || null,
    }

    if (!input.school_id) {
      setError("School is required")
      return
    }

    startTransition(async () => {
      let result
      if (mode === "create") {
        result = await createStudentApplication({ ...input, student_id: studentId } as CreateApplicationInput)
      } else if (application?.id) {
        result = await updateStudentApplication(application.id, studentId, input)
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
            New Application
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="sm:!max-w-[960px] !max-h-[92vh] !overflow-hidden !p-0 !gap-0 bg-background flex flex-col"
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
                <School className="h-5 w-5" />
              </div>
            </div>

            <DialogHeader className="flex-1 space-y-1">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {mode === "create" ? "New School Application" : "Edit Application"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {mode === "create"
                  ? "Submit a new school application for this student"
                  : "Update application details and status"}
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
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {error && (
              <div className="mb-5 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive animate-in slide-in-from-top-2 duration-300">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-5">
              {/* Left Column */}
              <div className="space-y-5">
                {/* School & Course */}
                <FormSection icon={School} title="School & Course" accentColor="primary">
                  <FormField label="School *">
                    <Select name="school_id" defaultValue={application?.school_id ?? ""}>
                      <SelectTrigger className={selectTriggerStyles}>
                        <SelectValue placeholder="Select school" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {schools.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Course">
                      <Select name="course_id" defaultValue={application?.course_id?.toString() ?? ""}>
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
                    <FormField label="Course Detail">
                      <Input name="course_detail" className={inputStyles} defaultValue={application?.course_detail ?? ""} placeholder="Additional info" />
                    </FormField>
                  </div>
                </FormSection>

                {/* Entry & Timing */}
                <FormSection icon={Calendar} title="Entry & Timing" accentColor="teal">
                  <FormField label="Year Apply / Entry Year">
                    <Input name="entry_year" className={inputStyles} defaultValue={application?.entry_year ?? ""} placeholder="e.g. Year 12 (2019-20)" />
                  </FormField>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="C.S.D. Month">
                      <Select name="course_start_month" defaultValue={application?.course_start_month?.toString() ?? ""}>
                        <SelectTrigger className={selectTriggerStyles}>
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((m) => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="C.S.D. Year">
                      <Input name="course_start_year" type="number" className={inputStyles} defaultValue={application?.course_start_year ?? ""} placeholder="2025" />
                    </FormField>
                  </div>
                </FormSection>

                {/* Status */}
                <FormSection icon={ClipboardList} title="Application Status" accentColor="amber">
                  <FormField label="Enrol Status">
                    <Select name="status_id" defaultValue={application?.status_id?.toString() ?? ""}>
                      <SelectTrigger className={selectTriggerStyles}>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {statuses.map((s) => (
                          <SelectItem key={s.id} value={s.id.toString()}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Sub-Enrol Status">
                    <Select name="sub_status_id" defaultValue={application?.sub_status_id?.toString() ?? ""}>
                      <SelectTrigger className={selectTriggerStyles}>
                        <SelectValue placeholder="Select sub-status" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {subStatuses.map((s) => (
                          <SelectItem key={s.id} value={s.id.toString()}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Mode">
                      <Select name="mode_id" defaultValue={application?.mode_id?.toString() ?? "1"}>
                        <SelectTrigger className={selectTriggerStyles}>
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                          {modes.map((m) => (
                            <SelectItem key={m.id} value={m.id.toString()}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Referral">
                      <Select name="is_referral" defaultValue={application?.is_referral ? "true" : "false"}>
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
              </div>

              {/* Right Column */}
              <div className="space-y-5">
                {/* Scholarship */}
                <FormSection icon={Award} title="Scholarship" accentColor="primary">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Amount">
                      <Input name="scholarship_amount" type="number" step="0.01" className={inputStyles} defaultValue={application?.scholarship_amount ?? "0"} placeholder="0" />
                    </FormField>
                    <FormField label="Detail">
                      <Input name="scholarship_detail" className={inputStyles} defaultValue={application?.scholarship_detail ?? ""} placeholder="Scholarship info" />
                    </FormField>
                  </div>
                </FormSection>

                {/* Event */}
                <FormSection icon={CalendarDays} title="Event" accentColor="teal">
                  <FormField label="Event">
                    <Select name="event_id" defaultValue={application?.event_id ?? ""}>
                      <SelectTrigger className={selectTriggerStyles}>
                        <SelectValue placeholder="No Event" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {events.map((ev) => (
                          <SelectItem key={ev.id} value={ev.id}>{ev.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Music Audition">
                    <Input name="music_audition" className={inputStyles} defaultValue={application?.music_audition ?? ""} placeholder="Music audition details" />
                  </FormField>
                </FormSection>

                {/* Remarks */}
                <FormSection icon={MessageSquare} title="Remarks" accentColor="amber">
                  <FormField label="Result Remarks">
                    <Textarea
                      name="result_remarks"
                      rows={3}
                      className="resize-none bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                      defaultValue={application?.result_remarks ?? ""}
                      placeholder="Result remarks..."
                    />
                  </FormField>
                  <FormField label="Remarks to School">
                    <Textarea
                      name="remarks_to_school"
                      rows={3}
                      className="resize-none bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                      defaultValue={application?.remarks_to_school ?? ""}
                      placeholder="Remarks sent to school..."
                    />
                  </FormField>
                  <FormField label="AA Remarks / Logs">
                    <Textarea
                      name="aa_remarks"
                      rows={3}
                      className="resize-none bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                      defaultValue={application?.aa_remarks ?? ""}
                      placeholder="Internal AA remarks..."
                    />
                  </FormField>
                </FormSection>

                {/* Registration */}
                <FormSection icon={CalendarDays} title="Registration" accentColor="rose">
                  <FormField label="Registration Date">
                    <Input name="registration_date" type="date" className={inputStyles} defaultValue={application?.registration_date ?? ""} />
                  </FormField>
                </FormSection>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border bg-muted/50 px-6 py-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                <span className="text-destructive">*</span> Required field
              </p>
              <div className="flex items-center gap-3">
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
                      {mode === "create" ? "Create Application" : "Save Changes"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Edit button for existing applications */
export function EditApplicationButton({
  application,
  studentId,
  referenceData,
}: {
  application: ApplicationWithJoins
  studentId: string
  referenceData: ApplicationReferenceData
}) {
  return (
    <ApplicationDialog
      studentId={studentId}
      referenceData={referenceData}
      mode="edit"
      application={application}
      trigger={
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      }
    />
  )
}

/** Delete application dialog */
export function DeleteApplicationButton({
  applicationId,
  studentId,
  schoolName,
}: {
  applicationId: string
  studentId: string
  schoolName: string
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = () => {
    setError(null)
    startTransition(async () => {
      const result = await deleteStudentApplication(applicationId, studentId)
      if (result.success) {
        setOpen(false)
      } else {
        setError(result.error ?? "Failed to delete application")
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
              <AlertDialogTitle className="text-lg">Delete Application</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the application to <strong className="text-foreground">{schoolName}</strong>?
                This will also remove any associated deposits. This action cannot be undone.
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
