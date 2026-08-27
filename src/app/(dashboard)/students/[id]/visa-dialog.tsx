"use client"

import { useRef, useState, useTransition } from "react"
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
  Shield,
  Calendar,
  ClipboardList,
  MessageSquare,
  CheckSquare,
  Check,
  Paperclip,
} from "lucide-react"
import {
  createStudentVisa,
  updateStudentVisa,
  deleteStudentVisa,
  type CreateVisaInput,
} from "@/lib/supabase/actions/student-visas"
import type { VisaWithJoins } from "@/lib/supabase/queries/student-visas"
import { AttachmentField, type AttachmentFieldHandle } from "@/components/features/attachment-field"
import type { AttachmentRecord } from "@/lib/supabase/queries/record-attachments"

type StatusItem = { id: number; code: string; label: string }
type SchoolItem = { id: string; name: string }

export type VisaReferenceData = {
  statuses: StatusItem[]
  schools: SchoolItem[]
}

type VisaDialogProps = {
  studentId: string
  referenceData: VisaReferenceData
  mode: "create" | "edit"
  visa?: VisaWithJoins
  trigger?: React.ReactNode
  attachments?: AttachmentRecord[]
  canWrite?: boolean
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

export function VisaDialog({
  studentId,
  referenceData,
  mode,
  visa,
  trigger,
  attachments = [],
  canWrite = true,
}: VisaDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const attachRef = useRef<AttachmentFieldHandle>(null)

  const { statuses, schools } = referenceData

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    const input: Omit<CreateVisaInput, 'student_id'> = {
      school_id: (formData.get("school_id") as string) || null,
      application: (formData.get("application") as string) || null,
      entry_month: formData.get("entry_month") ? parseInt(formData.get("entry_month") as string, 10) : null,
      entry_year_value: formData.get("entry_year_value") ? parseInt(formData.get("entry_year_value") as string, 10) : null,
      status_id: formData.get("status_id") ? parseInt(formData.get("status_id") as string, 10) : null,
      request_sent_to_parent: formData.get("request_sent_to_parent") === "true",
      passport_received: formData.get("passport_received") === "true",
      passport_sent_to_school: formData.get("passport_sent_to_school") === "true",
      sent_visa_information: formData.get("sent_visa_information") === "true",
      cas_received: formData.get("cas_received") === "true",
      visa_granted: formData.get("visa_granted") === "true",
      visa_copy: formData.get("visa_copy") === "true",
      visa_copy_sent: formData.get("visa_copy_sent") === "true",
      appointment: formData.get("appointment") === "true",
      appointment_date: (formData.get("appointment_date") as string) || null,
      remarks: (formData.get("remarks") as string) || null,
    }

    startTransition(async () => {
      let result
      if (mode === "create") {
        result = await createStudentVisa({ ...input, student_id: studentId } as CreateVisaInput)
        // Staged attachments could not be linked before the row existed.
        if (result?.success && result.data?.id) {
          const failed = await attachRef.current?.flush(result.data.id) ?? 0
          if (failed > 0) setError(`Visa saved, but ${failed} attachment(s) failed to upload`)
        }
      } else if (visa?.id) {
        result = await updateStudentVisa(visa.id, studentId, input)
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
            New Visa
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
                <Shield className="h-5 w-5" />
              </div>
            </div>

            <DialogHeader className="flex-1 space-y-1">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {mode === "create" ? "New Visa Application" : "Edit Visa Application"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {mode === "create"
                  ? "Create a new visa application for this student"
                  : "Update visa application details and checklist"}
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
                <FormSection icon={Shield} title="School & Application" accentColor="primary">
                  <FormField label="School">
                    <Select name="school_id" defaultValue={visa?.school_id ?? ""}>
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
                  <FormField label="Application">
                    <Input name="application" className={inputStyles} defaultValue={visa?.application ?? ""} placeholder="Application reference" />
                  </FormField>
                </FormSection>

                <FormSection icon={ClipboardList} title="Status & Entry Year" accentColor="teal">
                  <FormField label="Status">
                    <Select name="status_id" defaultValue={visa?.status_id?.toString() ?? "1"}>
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
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Entry Month">
                      <Select name="entry_month" defaultValue={visa?.entry_month?.toString() ?? ""}>
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
                    <FormField label="Entry Year">
                      <Input name="entry_year_value" type="number" className={inputStyles} defaultValue={visa?.entry_year_value ?? ""} placeholder="2025" />
                    </FormField>
                  </div>
                </FormSection>

                <FormSection icon={MessageSquare} title="Remarks" accentColor="amber">
                  <FormField label="Remarks">
                    <Textarea
                      name="remarks"
                      rows={5}
                      className="resize-none bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                      defaultValue={visa?.remarks ?? ""}
                      placeholder="Notes about this visa application..."
                    />
                  </FormField>
                </FormSection>
              </div>

              {/* Right Column */}
              <div className="space-y-5">
                <FormSection icon={CheckSquare} title="Visa Checklist" accentColor="primary">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Sent Request to Parent (SR)">
                      <Select name="request_sent_to_parent" defaultValue={visa?.request_sent_to_parent ? "true" : "false"}>
                        <SelectTrigger className={selectTriggerStyles}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="false">No</SelectItem>
                          <SelectItem value="true">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Passport Received (PR)">
                      <Select name="passport_received" defaultValue={visa?.passport_received ? "true" : "false"}>
                        <SelectTrigger className={selectTriggerStyles}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="false">No</SelectItem>
                          <SelectItem value="true">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Passport Sent to School (PS)">
                      <Select name="passport_sent_to_school" defaultValue={visa?.passport_sent_to_school ? "true" : "false"}>
                        <SelectTrigger className={selectTriggerStyles}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="false">No</SelectItem>
                          <SelectItem value="true">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Sent Visa Information (SV)">
                      <Select name="sent_visa_information" defaultValue={visa?.sent_visa_information ? "true" : "false"}>
                        <SelectTrigger className={selectTriggerStyles}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="false">No</SelectItem>
                          <SelectItem value="true">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="CAS Received">
                      <Select name="cas_received" defaultValue={visa?.cas_received ? "true" : "false"}>
                        <SelectTrigger className={selectTriggerStyles}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="false">No</SelectItem>
                          <SelectItem value="true">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Visa Granted (VG)">
                      <Select name="visa_granted" defaultValue={visa?.visa_granted ? "true" : "false"}>
                        <SelectTrigger className={selectTriggerStyles}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="false">No</SelectItem>
                          <SelectItem value="true">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Visa Copy (VC)">
                      <Select name="visa_copy" defaultValue={visa?.visa_copy ? "true" : "false"}>
                        <SelectTrigger className={selectTriggerStyles}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="false">No</SelectItem>
                          <SelectItem value="true">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Visa Copy Sent (VCS)">
                      <Select name="visa_copy_sent" defaultValue={visa?.visa_copy_sent ? "true" : "false"}>
                        <SelectTrigger className={selectTriggerStyles}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="false">No</SelectItem>
                          <SelectItem value="true">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                </FormSection>

                <FormSection icon={Paperclip} title="Attachments" accentColor="rose">
                  <FormField label="Visa documents (file or link)">
                    <AttachmentField
                      ref={attachRef}
                      attachPoint="student_visa"
                      ownerId={studentId}
                      attachableId={mode === "edit" ? visa?.id ?? null : null}
                      attachments={attachments}
                      canWrite={canWrite}
                    />
                  </FormField>
                </FormSection>

                <FormSection icon={Calendar} title="Appointment" accentColor="teal">
                  <FormField label="Has Appointment (AP)">
                    <Select name="appointment" defaultValue={visa?.appointment ? "true" : "false"}>
                      <SelectTrigger className={selectTriggerStyles}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">No</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Appointment Date & Time">
                    <Input
                      name="appointment_date"
                      type="datetime-local"
                      className={inputStyles}
                      defaultValue={visa?.appointment_date ? visa.appointment_date.slice(0, 16) : ""}
                    />
                  </FormField>
                </FormSection>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border bg-muted/50 px-6 py-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                School list shows schools from existing applications
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
                      {mode === "create" ? "Create Visa" : "Save Changes"}
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

/** Edit button for existing visa entries */
export function EditVisaButton({
  visa,
  studentId,
  referenceData,
  attachments = [],
  canWrite = true,
}: {
  visa: VisaWithJoins
  studentId: string
  referenceData: VisaReferenceData
  attachments?: AttachmentRecord[]
  canWrite?: boolean
}) {
  return (
    <VisaDialog
      studentId={studentId}
      referenceData={referenceData}
      mode="edit"
      visa={visa}
      attachments={attachments}
      canWrite={canWrite}
      trigger={
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      }
    />
  )
}

/** Delete visa entry dialog */
export function DeleteVisaButton({
  visaId,
  studentId,
  schoolName,
}: {
  visaId: string
  studentId: string
  schoolName: string
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = () => {
    setError(null)
    startTransition(async () => {
      const result = await deleteStudentVisa(visaId, studentId)
      if (result.success) {
        setOpen(false)
      } else {
        setError(result.error ?? "Failed to delete visa entry")
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
              <AlertDialogTitle className="text-lg">Delete Visa Application</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the visa application for <strong className="text-foreground">{schoolName}</strong>?
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
