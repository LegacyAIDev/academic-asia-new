"use client"

import { useRef, useState, useTransition, useMemo } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronsUpDown,
  Loader2,
  Pencil,
  Plus,
  School,
  Trash2,
} from "lucide-react"
import {
  createStudentApplication,
  updateStudentApplication,
  deleteStudentApplication,
  type CreateApplicationInput,
} from "@/lib/supabase/actions/student-applications"
import type { ApplicationWithJoins } from "@/lib/supabase/queries/student-applications"
import { createApplicationDeposit } from "@/lib/supabase/actions/student-application-deposits"
import { createIndividualExam } from "@/lib/supabase/actions/student-individual-exams"
import { ApplicationDepositSection } from "./application-deposit-section"
import { ApplicationExamSection } from "./application-exam-section"
import { AttachmentField, type AttachmentFieldHandle } from "@/components/features/attachment-field"
import type { AttachmentRecord } from "@/lib/supabase/queries/record-attachments"
import { parseDateOnly, toDateOnly } from "@/lib/date-only"
import { groupStatusesByStage } from "@/lib/applications/application-journey"
import { useAddParam } from "@/lib/students/use-add-param"

type ReferenceItem = { id: number; code: string; label: string }
type StatusItem = ReferenceItem & { category: string | null }
type SchoolItem = { id: string; name: string }
type EventItem = { id: string; name: string; school_id: string | null; start_date: string | null; start_time: string | null }
export type ApplicationReferenceData = {
  statuses: StatusItem[]
  modes: ReferenceItem[]
  schools: SchoolItem[]
  events: EventItem[]
}

type ApplicationDialogProps = {
  studentId: string
  referenceData: ApplicationReferenceData
  mode: "create" | "edit"
  application?: ApplicationWithJoins
  trigger?: React.ReactNode
  attachments?: AttachmentRecord[]
  canWrite?: boolean
  attachmentsByDeposit?: Map<string, AttachmentRecord[]>
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

/** A folded group of optional fields; native <details>, so it stays in the form when closed. */
function MoreDetails({ title, open, children }: { title: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details open={open} className="group rounded-lg border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="space-y-4 border-t px-4 py-4">{children}</div>
    </details>
  )
}

/** `count` years from `from`, plus a saved year outside that range so it still shows. */
function yearOptions(from: number, count: number, saved?: number | null): number[] {
  const years = Array.from({ length: count }, (_, i) => from + i)
  return saved && !years.includes(saved) ? [saved, ...years] : years
}

const MONTHS = [
  { value: "1", label: "Jan" }, { value: "2", label: "Feb" },
  { value: "3", label: "Mar" }, { value: "4", label: "Apr" },
  { value: "5", label: "May" }, { value: "6", label: "Jun" },
  { value: "7", label: "Jul" }, { value: "8", label: "Aug" },
  { value: "9", label: "Sep" }, { value: "10", label: "Oct" },
  { value: "11", label: "Nov" }, { value: "12", label: "Dec" },
]

const SCHOLARSHIP_TYPES = [
  { value: "music", label: "Music" },
  { value: "arts", label: "Arts" },
  { value: "academic", label: "Academic" },
  { value: "sports", label: "Sports" },
  { value: "others", label: "Others" },
]

export function ApplicationDialog({
  studentId,
  referenceData,
  mode,
  application,
  trigger,
  attachments = [],
  attachmentsByDeposit,
  canWrite = true,
}: ApplicationDialogProps) {
  const [open, setOpen] = useAddParam(mode === "create" ? "application" : null)
  const attachRef = useRef<AttachmentFieldHandle>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [scholarshipTypes, setScholarshipTypes] = useState<string[]>(application?.scholarship_types ?? [])

  const parseDate = parseDateOnly
  const defaultRegDate = useMemo(() => application?.registration_date ? parseDateOnly(application.registration_date) : new Date(), [application])

  const [regDate, setRegDate] = useState<Date | undefined>(defaultRegDate)
  const [regDateOpen, setRegDateOpen] = useState(false)
  const [visitDate, setVisitDate] = useState<Date | undefined>(parseDate(application?.visit_date))
  const [visitDateOpen, setVisitDateOpen] = useState(false)
  const [depositDate, setDepositDate] = useState<Date | undefined>(undefined)
  const [depositCommission, setDepositCommission] = useState(true)
  const [examPrefDate, setExamPrefDate] = useState<Date | undefined>(undefined)
  const [selectedSchoolId, setSelectedSchoolId] = useState(application?.school_id ?? "")
  const [schoolSearchOpen, setSchoolSearchOpen] = useState(false)

  // Entry & Course Start Date. CSD mirrors Entry until the user edits CSD directly,
  // so "Entry Sep 2026" yields "CSD Sep 2026" instead of a stray default.
  const [entryMonth, setEntryMonth] = useState(application?.entry_month?.toString() ?? "")
  const [entryYear, setEntryYear] = useState(application?.entry_year?.toString() ?? "")
  const [csdMonth, setCsdMonth] = useState(application?.course_start_month?.toString() ?? "")
  const [csdYear, setCsdYear] = useState(application?.course_start_year?.toString() ?? "")
  const [csdTouched, setCsdTouched] = useState(
    !!(application?.course_start_month || application?.course_start_year)
  )
  const handleEntryMonth = (v: string) => { setEntryMonth(v); if (!csdTouched) setCsdMonth(v) }
  const handleEntryYear = (v: string) => { setEntryYear(v); if (!csdTouched) setCsdYear(v) }

  const formatDateDisplay = (date: Date | undefined) =>
    date ? date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null
  const formatDateValue = (date: Date | undefined) =>
    date ? toDateOnly(date) : null

  const { statuses, modes, schools, events } = referenceData
  const statusGroups = useMemo(() => groupStatusesByStage(statuses), [statuses])
  // A new application starts at the first step of the journey.
  const defaultStatusId = statusGroups[0]?.statuses[0]?.id.toString() ?? ""
  // Optional groups that already hold something open by themselves when editing.
  const has = {
    course: Boolean(application?.course_start_year || application?.is_referral || (application?.mode_id && application.mode_id !== 1)),
    scholarship: Boolean(application?.scholarship_types?.length || application?.scholarship_detail),
    event: Boolean(application?.event_id || application?.music_audition),
    visit: Boolean(application?.visit_date || application?.school_contact || application?.visit_remarks),
    remarks: Boolean(application?.result_remarks || application?.remarks_to_school || application?.aa_remarks),
    depositOrExam: Boolean(application?.deposits?.length || application?.exams?.length),
  }
  const [selectedEventId, setSelectedEventId] = useState(application?.event_id ?? "")

  // Only show events linked to the selected school
  const filteredEvents = selectedSchoolId
    ? events.filter(ev => ev.school_id === selectedSchoolId)
    : []

  // The event's own date is saved with the application (event_date below).
  const selectedEvent = events.find(ev => ev.id === selectedEventId)
  const handleEventSelect = (eventId: string) => setSelectedEventId(eventId)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    const input: Omit<CreateApplicationInput, 'student_id'> = {
      school_id: formData.get("school_id") as string,
      year_group: formData.get("year_group") ? parseInt(formData.get("year_group") as string, 10) : null,
      entry_year: entryYear ? parseInt(entryYear, 10) : null,
      entry_month: entryMonth ? parseInt(entryMonth, 10) : null,
      course_start_month: csdMonth ? parseInt(csdMonth, 10) : null,
      course_start_year: csdYear ? parseInt(csdYear, 10) : null,
      status_id: formData.get("status_id") ? parseInt(formData.get("status_id") as string, 10) : null,
      mode_id: formData.get("mode_id") ? parseInt(formData.get("mode_id") as string, 10) : null,
      is_referral: formData.get("is_referral") === "true",
      scholarship_detail: (formData.get("scholarship_detail") as string) || null,
      scholarship_types: scholarshipTypes.length > 0 ? scholarshipTypes : null,
      event_id: selectedEventId || null,
      event_date: selectedEvent?.start_date ?? null,
      event_time: selectedEvent?.start_time?.slice(0, 5) ?? null,
      music_audition: (formData.get("music_audition") as string) || null,
      result_remarks: (formData.get("result_remarks") as string) || null,
      remarks_to_school: (formData.get("remarks_to_school") as string) || null,
      aa_remarks: (formData.get("aa_remarks") as string) || null,
      registration_date: formatDateValue(regDate),
      visit_date: formatDateValue(visitDate),
      visit_time: (formData.get("visit_time") as string) || null,
      school_contact: (formData.get("school_contact") as string) || null,
      visit_remarks: (formData.get("visit_remarks") as string) || null,
    }

    if (!input.school_id) {
      setError("School is required")
      return
    }

    startTransition(async () => {
      let result
      if (mode === "create") {
        result = await createStudentApplication({ ...input, student_id: studentId } as CreateApplicationInput)

        // Save deposit if any deposit field was filled
        if (result?.success && result.data?.id) {
          const depAmount = formData.get("deposit_amount") as string
          const depDiscount = formData.get("deposit_discount") as string
          const depRemarks = (formData.get("deposit_remarks") as string) || null
          const hasDepositData = depAmount || depDiscount || depositDate || depRemarks

          if (hasDepositData) {
            await createApplicationDeposit({
              application_id: result.data.id,
              deposit_date: formatDateValue(depositDate),
              amount: depAmount ? parseFloat(depAmount) : null,
              discount: depDiscount ? parseFloat(depDiscount) : null,
              has_commission: depositCommission,
              remarks: depRemarks,
            }, studentId)
          }

          // Save exam booking if any exam field was filled
          const examSubject = (formData.get("exam_subject") as string) || null
          const examYear = (formData.get("exam_year") as string) || null
          const examMethod = formData.get("exam_method") as string
          const examPrefTime = (formData.get("exam_pref_time") as string) || null
          const examRemarks = (formData.get("exam_remarks") as string) || null
          const hasExamData = examSubject || examYear || examPrefDate || examRemarks

          if (hasExamData) {
            await createIndividualExam({
              student_id: studentId,
              school_id: input.school_id,
              application_id: result.data.id,
              exam_type_id: 2,
              subject: examSubject,
              apply_year: examYear,
              delivery_mode_id: examMethod ? parseInt(examMethod, 10) : null,
              preferred_date: formatDateValue(examPrefDate),
              preferred_start_time: examPrefTime,
              remarks: examRemarks,
              status_id: 1,
            }, studentId)
          }

          // Staged attachments could not be linked before the row existed.
          const failed = await attachRef.current?.flush(result.data.id) ?? 0
          if (failed > 0) setError(`Application saved, but ${failed} attachment(s) failed to upload`)
        }
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
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v)
      if (v) {
        setScholarshipTypes(application?.scholarship_types ?? [])
        setRegDate(application?.registration_date ? parseDate(application.registration_date) : new Date())
        setVisitDate(parseDate(application?.visit_date))
        setDepositDate(undefined)
        setDepositCommission(true)
        setExamPrefDate(undefined)
      }
    }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add application
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="sm:!max-w-[680px] !max-h-[92vh] !overflow-hidden !p-0 !gap-0 bg-background flex flex-col"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="relative shrink-0 border-b border-border">

          <div className="relative flex items-center gap-3 px-6 py-4">
            <div className="relative">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-md bg-brand-navy/[0.07] text-brand-navy">
                <School className="h-5 w-5" />
              </div>
            </div>

            <DialogHeader className="flex-1 space-y-1">
              <DialogTitle className="text-lg font-semibold">
                {mode === "create" ? "New school application" : "Edit application"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {mode === "create"
                  ? "Only the school is needed to start; add the rest as it happens."
                  : "Change any detail; optional groups open below."}
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

            <div className="space-y-5">
              {/* The essentials: enough to save an application. */}
              <FormField label="School *">
                <input type="hidden" name="school_id" value={selectedSchoolId} />
                <Popover open={schoolSearchOpen} onOpenChange={setSchoolSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={schoolSearchOpen} aria-label="School"
                      className={`${selectTriggerStyles} w-full justify-between font-normal`}>
                      {selectedSchoolId
                        ? schools.find(s => s.id === selectedSchoolId)?.name ?? "Search for the school"
                        : <span className="text-muted-foreground">Search for the school</span>}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Type the school's name" />
                      <CommandList>
                        <CommandEmpty>No school found.</CommandEmpty>
                        <CommandGroup>
                          {schools.map((s) => (
                            <CommandItem key={s.id} value={s.name} onSelect={() => {
                              setSelectedSchoolId(s.id)
                              setSchoolSearchOpen(false)
                            }}>
                              <Check className={`mr-2 h-4 w-4 ${selectedSchoolId === s.id ? "opacity-100" : "opacity-0"}`} />
                              {s.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </FormField>

              <div className="grid gap-4 sm:grid-cols-3">
                <FormField label="Year group">
                  <Select name="year_group" defaultValue={application?.year_group?.toString() ?? ""}>
                    <SelectTrigger className={`${selectTriggerStyles} w-full`}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 13 }, (_, i) => i + 1).map((y) => (
                        <SelectItem key={y} value={y.toString()}>Year {y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Entry" className="sm:col-span-2">
                  <div className="flex gap-2">
                    <Select value={entryMonth} onValueChange={handleEntryMonth}>
                      <SelectTrigger className={`${selectTriggerStyles} w-full`} aria-label="Entry month">
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={entryYear} onValueChange={handleEntryYear}>
                      <SelectTrigger className={`${selectTriggerStyles} w-full`} aria-label="Entry year">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions(new Date().getFullYear(), 6, application?.entry_year).map((y) => (
                          <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </FormField>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Status">
                  <Select name="status_id" defaultValue={application?.status_id?.toString() ?? defaultStatusId}>
                    <SelectTrigger className={`${selectTriggerStyles} w-full`} aria-label="Status">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {statusGroups.map(group => (
                        <SelectGroup key={group.key}>
                          <SelectLabel>{group.label}</SelectLabel>
                          {group.statuses.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.label}</SelectItem>)}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">The school&apos;s own status, grouped by step of the journey.</p>
                </FormField>
                <FormField label="Registered with the school">
                  <Popover open={regDateOpen} onOpenChange={setRegDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={`w-full justify-start font-normal ${inputStyles}`} aria-label="Registration date">
                        <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                        {formatDateDisplay(regDate) ?? <span className="text-muted-foreground">Not registered yet</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={regDate}
                        defaultMonth={regDate}
                        onSelect={(date) => { setRegDate(date); setRegDateOpen(false) }}
                      />
                    </PopoverContent>
                  </Popover>
                </FormField>
              </div>

              {/* Everything else, folded away until it is needed. */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">More details <span className="font-normal text-muted-foreground">(optional)</span></p>

                <MoreDetails title="Course start, mode and referral" open={has.course}>
                  <FormField label="Course starts">
                    <div className="flex gap-2">
                      <Select value={csdMonth} onValueChange={(v) => { setCsdTouched(true); setCsdMonth(v) }}>
                        <SelectTrigger className={`${selectTriggerStyles} w-full`} aria-label="Course start month">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={csdYear} onValueChange={(v) => { setCsdTouched(true); setCsdYear(v) }}>
                        <SelectTrigger className={`${selectTriggerStyles} w-full`} aria-label="Course start year">
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {yearOptions(new Date().getFullYear() - 1, 7, application?.course_start_year).map((y) => (
                            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">Follows the entry date unless you change it.</p>
                  </FormField>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Mode">
                      <Select name="mode_id" defaultValue={application?.mode_id?.toString() ?? "1"}>
                        <SelectTrigger className={`${selectTriggerStyles} w-full`}>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {modes.map((m) => <SelectItem key={m.id} value={m.id.toString()}>{m.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Suspended hides it from the usual lists.</p>
                    </FormField>
                    <FormField label="Referred by Academic Asia">
                      <Select name="is_referral" defaultValue={application?.is_referral ? "true" : "false"}>
                        <SelectTrigger className={`${selectTriggerStyles} w-full`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="false">No</SelectItem>
                          <SelectItem value="true">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                </MoreDetails>

                <MoreDetails title="Scholarship" open={has.scholarship}>
                  <FormField label="Type">
                    <div className="flex flex-wrap gap-4">
                      {SCHOLARSHIP_TYPES.map((t) => (
                        <label key={t.value} className="flex cursor-pointer items-center gap-2">
                          <Checkbox
                            checked={scholarshipTypes.includes(t.value)}
                            onCheckedChange={(checked) => {
                              setScholarshipTypes(prev => checked ? [...prev, t.value] : prev.filter(v => v !== t.value))
                            }}
                          />
                          <span className="text-sm">{t.label}</span>
                        </label>
                      ))}
                    </div>
                  </FormField>
                  <FormField label="Details">
                    <Input name="scholarship_detail" className={inputStyles} defaultValue={application?.scholarship_detail ?? ""} placeholder="e.g. 20% music scholarship" />
                  </FormField>
                </MoreDetails>

                <MoreDetails title="Admission event and audition" open={has.event}>
                  <FormField label="Admission event">
                    <input type="hidden" name="event_id" value={selectedEventId} />
                    {filteredEvents.length === 0 ? (
                      <p className="py-2 text-sm text-muted-foreground">
                        {selectedSchoolId
                          ? "This school has no admission events in the system."
                          : "Choose the school above to see its admission events."}
                      </p>
                    ) : (
                      <Select value={selectedEventId} onValueChange={handleEventSelect}>
                        <SelectTrigger className={`${selectTriggerStyles} w-full`}>
                          <SelectValue placeholder="Select event" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {filteredEvents.map((ev) => <SelectItem key={ev.id} value={ev.id}>{ev.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                    {selectedEvent && (
                      <p className="text-xs text-muted-foreground">
                        {selectedEvent.start_date ? new Date(selectedEvent.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Date to be set"}
                        {selectedEvent.start_time ? `, ${selectedEvent.start_time.slice(0, 5)}` : ""}
                      </p>
                    )}
                  </FormField>
                  <FormField label="Music audition">
                    <Input name="music_audition" className={inputStyles} defaultValue={application?.music_audition ?? ""} placeholder="e.g. Grade 8 violin, 15 Jan" />
                  </FormField>
                </MoreDetails>

                <MoreDetails title="School visit" open={has.visit}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Visit date">
                      <Popover open={visitDateOpen} onOpenChange={setVisitDateOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={`w-full justify-start font-normal ${inputStyles}`} aria-label="Visit date">
                            <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                            {formatDateDisplay(visitDate) ?? <span className="text-muted-foreground">Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                          <CalendarComponent mode="single" selected={visitDate} defaultMonth={visitDate} onSelect={(date) => { setVisitDate(date); setVisitDateOpen(false) }} />
                        </PopoverContent>
                      </Popover>
                    </FormField>
                    <FormField label="Visit time">
                      <Input name="visit_time" type="time" className={inputStyles} defaultValue={application?.visit_time ?? ""} />
                    </FormField>
                  </div>
                  <FormField label="Contact at the school">
                    <Input name="school_contact" className={inputStyles} defaultValue={application?.school_contact ?? ""} placeholder="e.g. Mrs Smith, Admissions" />
                  </FormField>
                  <FormField label="Visit notes">
                    <Input name="visit_remarks" className={inputStyles} defaultValue={application?.visit_remarks ?? ""} placeholder="How the visit went" />
                  </FormField>
                </MoreDetails>

                <MoreDetails title="Remarks" open={has.remarks}>
                  <FormField label="About the status or result">
                    <Textarea name="result_remarks" rows={3} className="resize-y" defaultValue={application?.result_remarks ?? ""} placeholder="e.g. Offer conditional on interview" />
                  </FormField>
                  <FormField label="Sent to the school">
                    <Textarea name="remarks_to_school" rows={3} className="resize-y" defaultValue={application?.remarks_to_school ?? ""} placeholder="What we told the school" />
                  </FormField>
                  <FormField label="Internal (staff only)">
                    <Textarea name="aa_remarks" rows={3} className="resize-y" defaultValue={application?.aa_remarks ?? ""} placeholder="Notes for the team" />
                  </FormField>
                </MoreDetails>

                <MoreDetails title="Attachments" open={attachments.length > 0}>
                  <AttachmentField
                    ref={attachRef}
                    attachPoint="student_application"
                    ownerId={studentId}
                    attachableId={mode === "edit" ? application?.id ?? null : null}
                    attachments={attachments}
                    canWrite={canWrite}
                  />
                </MoreDetails>

                <MoreDetails title="Deposit and entrance exam" open={has.depositOrExam}>
                  <ApplicationDepositSection
                    applicationId={application?.id ?? ""}
                    studentId={studentId}
                    deposits={application?.deposits ?? []}
                    isCreate={mode === "create"}
                    depositDate={depositDate}
                    onDepositDateChange={setDepositDate}
                    commission={depositCommission}
                    onCommissionChange={setDepositCommission}
                    attachmentsByDeposit={attachmentsByDeposit}
                    canWrite={canWrite}
                  />
                  <ApplicationExamSection
                    applicationId={application?.id ?? ""}
                    studentId={studentId}
                    schoolId={application?.school_id ?? ""}
                    exams={application?.exams ?? []}
                    isCreate={mode === "create"}
                    defaultYear={application?.entry_year?.toString() ?? ""}
                    examPrefDate={examPrefDate}
                    onExamPrefDateChange={setExamPrefDate}
                  />
                </MoreDetails>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-border bg-muted/40 px-6 py-3">
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
                  className="min-w-[140px] gap-2"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {mode === "create" ? "Creating..." : "Saving..."}
                    </>
                  ) : (
                    <>
                      {mode === "create" ? <Plus className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      {mode === "create" ? "Add application" : "Save changes"}
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
  attachments = [],
  attachmentsByDeposit,
  canWrite = true,
}: {
  application: ApplicationWithJoins
  studentId: string
  referenceData: ApplicationReferenceData
  attachments?: AttachmentRecord[]
  attachmentsByDeposit?: Map<string, AttachmentRecord[]>
  canWrite?: boolean
}) {
  return (
    <ApplicationDialog
      studentId={studentId}
      referenceData={referenceData}
      mode="edit"
      application={application}
      attachments={attachments}
      attachmentsByDeposit={attachmentsByDeposit}
      canWrite={canWrite}
      trigger={
        <Button aria-label="Edit" title="Edit" variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
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
