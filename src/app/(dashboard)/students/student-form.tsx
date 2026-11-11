"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DateField } from "@/components/ui/date-field"
import { PhoneInput } from "@/components/ui/phone-input"
import { Loader2, Save } from "lucide-react"
import { createStudent, updateStudent, type CreateStudentInput} from "@/lib/supabase/actions/students"
import { AttachmentField, type AttachmentFieldHandle } from "@/components/features/attachment-field"
import type { AttachmentRecord } from "@/lib/supabase/queries/record-attachments"
import type { StudentWithJoins } from "@/lib/supabase/queries/students"
import type { PresentSchoolOption } from "@/lib/supabase/queries/present-schools"
import { PresentSchoolPicker } from "./present-school-picker"
import { parseDateOnly, toDateOnly } from "@/lib/date-only"
import { useRouterWithProgress } from "@/components/layout/navigation-progress"

const GRID = "grid gap-4 @md:grid-cols-2 @3xl:grid-cols-3 [&>*]:min-w-0"
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** This year and the next five, plus a saved year outside that range so it still shows. */
function entryYears(saved: number | null | undefined): number[] {
  const now = new Date().getFullYear()
  const years = Array.from({ length: 6 }, (_, i) => now + i)
  return saved && !years.includes(saved) ? [saved, ...years] : years
}

/** A titled group of fields. */
function FormBlock({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-lg border bg-card p-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}

/** A label, the control and an optional line of help under it. */
function Field({ id, label, required, hint, className, children }: {
  id: string
  label: string
  required?: boolean
  hint?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`min-w-0 space-y-2 ${className ?? ""}`}>
      <Label htmlFor={id}>
        {label}{required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

type ReferenceItem = {
  id: number
  code: string
  label: string
  category?: string | null
  region?: string | null
}

export type StudentFormProps = {
  mode: "create" | "edit"
  student?: StudentWithJoins | null
  referenceData: {
    statuses: ReferenceItem[]
    placements: ReferenceItem[]
    nationalities: ReferenceItem[]
    courses: ReferenceItem[]
    schoolTypes: ReferenceItem[]
    events: { id: string; name: string }[]
    profiles: { id: string; first_name: string | null; surname: string | null }[]
  }
  presentSchools: PresentSchoolOption[]
  examPaperAttachments?: AttachmentRecord[]
  canWrite?: boolean
  /** Called after a successful save (with the new student's id when adding) instead of the form navigating itself; drawers use it. */
  onDone?: (studentId?: string) => void
  /** Called by Cancel instead of leaving the page. */
  onCancel?: () => void
}

export function StudentForm({
  mode, student, referenceData, presentSchools, examPaperAttachments = [], canWrite = true, onDone, onCancel,
}: StudentFormProps) {
  const router = useRouterWithProgress()
  const attachRef = useRef<AttachmentFieldHandle>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const errorRef = useRef<HTMLDivElement>(null)
  const [addingSchool, setAddingSchool] = useState(false)
  const [dob, setDob] = useState<Date | undefined>(
    parseDateOnly(student?.date_of_birth)
  )

  const { statuses, placements, nationalities, courses, schoolTypes, events, profiles } = referenceData
  const [leadCategory, setLeadCategory] = useState<string>(student?.lead_source_category ?? "")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    const input: CreateStudentInput = {
      surname: formData.get("surname") as string,
      first_name: formData.get("first_name") as string,
      chinese_name: (formData.get("chinese_name") as string) || null,
      gender: (formData.get("gender") as string) || null,
      date_of_birth: dob ? toDateOnly(dob) : null,
      nationality_id: formData.get("nationality_id") ? parseInt(formData.get("nationality_id") as string, 10) : null,
      passport_type: (formData.get("passport_type") as string) || null,
      passport_number: (formData.get("passport_number") as string) || null,
      email: (formData.get("email") as string) || null,
      mobile: (formData.get("mobile") as string) || null,
      telephone: (formData.get("telephone") as string) || null,
      address_line_1: (formData.get("address_line_1") as string) || null,
      chinese_address: (formData.get("chinese_address") as string) || null,
      present_school: (formData.get("present_school") as string) || null,
      present_school_id: formData.get("present_school_id") ? parseInt(formData.get("present_school_id") as string, 10) : null,
      present_school_type_id: formData.get("present_school_type_id") ? parseInt(formData.get("present_school_type_id") as string, 10) : null,
      course_id: formData.get("course_id") ? parseInt(formData.get("course_id") as string, 10) : null,
      entry_year: formData.get("entry_year") ? parseInt(formData.get("entry_year") as string, 10) : null,
      entry_month: formData.get("entry_month") ? parseInt(formData.get("entry_month") as string, 10) : null,
      enrollment_date: (formData.get("enrollment_date") as string) || null,
      lead_source_category: leadCategory || null,
      lead_source_referral_detail: leadCategory === "referral" ? ((formData.get("lead_source_referral_detail") as string) || null) : null,
      lead_source_event_id: leadCategory === "events" ? ((formData.get("lead_source_event_id") as string) || null) : null,
      status_id: formData.get("status_id") ? parseInt(formData.get("status_id") as string, 10) : null,
      placement_id: formData.get("placement_id") ? parseInt(formData.get("placement_id") as string, 10) : null,
      exam_paper: (formData.get("exam_paper") as string) || null,
      remarks: (formData.get("remarks") as string) || null,
      aa_news: formData.get("aa_news") === "on",
      airport_pickup: formData.get("airport_pickup") === "on",
      assigned_to: (formData.get("assigned_to") as string) || null,
    }

    startTransition(async () => {
      let result
      if (mode === "create") {
        result = await createStudent(input)
      } else if (student?.id) {
        result = await updateStudent(student.id, input, { expectedUpdatedAt: student.updated_at })
      }

      if (result?.success) {
        // On a new student the exam paper had nowhere to attach until now.
        if (mode === "create" && result.data?.id) {
          await attachRef.current?.flush(result.data.id, result.data.id)
        }

        if (onDone) {
          onDone(result.data?.id ?? student?.id)
        } else if (mode === "create" && result.data?.id) {
          router.push(`/students/${result.data.id}`)
        } else if (student?.id) {
          router.push(`/students/${student.id}`)
        } else {
          router.push("/students")
        }
      } else {
        setConflict(result?.conflict === true)
        setError(result?.error ?? "An error occurred")
      }
    })
  }

  // The error box sits above the form; bring it into view after a failed save.
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [error])

  return (
    <form onSubmit={handleSubmit} className="@container space-y-6">
      {error && (
        <div ref={errorRef} role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <span className="flex-1">{error}</span>
          {conflict && (
            <Button type="button" variant="outline" size="sm" onClick={() => window.location.reload()}>
              Reload latest details
            </Button>
          )}
        </div>
      )}

      <FormBlock title="Personal details">
        <div className={GRID}>
          <Field id="surname" label="Surname" required>
            <Input id="surname" name="surname" placeholder="e.g. CHAN" required className="uppercase placeholder:normal-case" defaultValue={student?.surname ?? ""} />
          </Field>
          <Field id="first_name" label="First name" required>
            <Input id="first_name" name="first_name" placeholder="e.g. Sophie" required defaultValue={student?.first_name ?? ""} />
          </Field>
          <Field id="chinese_name" label="Chinese name">
            <Input id="chinese_name" name="chinese_name" placeholder="e.g. 陳思穎" defaultValue={student?.chinese_name ?? ""} />
          </Field>
          <Field id="gender" label="Gender">
            <Select name="gender" defaultValue={student?.gender ?? ""}>
              <SelectTrigger id="gender" className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Male</SelectItem>
                <SelectItem value="F">Female</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field id="date_of_birth" label="Date of birth">
            <DateField
              id="date_of_birth"
              name="date_of_birth_display"
              defaultValue={student?.date_of_birth ?? null}
              fromYear={1990}
              toYear={new Date().getFullYear()}
              onChange={value => setDob(parseDateOnly(value))}
            />
          </Field>
          <Field id="nationality_id" label="Nationality">
            <Select name="nationality_id" defaultValue={student?.nationality?.id?.toString() ?? ""}>
              <SelectTrigger id="nationality_id" className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {nationalities.map(nat => <SelectItem key={nat.id} value={nat.id.toString()}>{nat.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field id="passport_type" label="Passport type">
            <Input id="passport_type" name="passport_type" placeholder="e.g. HKSAR" defaultValue={student?.passport_type ?? ""} />
          </Field>
          <Field id="passport_number" label="Passport number">
            <Input id="passport_number" name="passport_number" placeholder="e.g. K1234567" defaultValue={student?.passport_number ?? ""} />
          </Field>
        </div>
      </FormBlock>

      <FormBlock title="Contact">
        <div className={GRID}>
          <Field id="email" label="Email">
            <Input id="email" name="email" type="email" placeholder="e.g. student@email.com" defaultValue={student?.email ?? ""} />
          </Field>
          <Field id="mobile" label="Mobile">
            <PhoneInput name="mobile" defaultValue={student?.mobile ?? ""} defaultCountryCode="852" placeholder="e.g. 9123 4567" />
          </Field>
          <Field id="telephone" label="Home phone">
            <PhoneInput name="telephone" defaultValue={student?.telephone ?? ""} defaultCountryCode="852" placeholder="e.g. 2577 8048" />
          </Field>
          <Field id="address_line_1" label="Address" className="@md:col-span-2 @3xl:col-span-3">
            <Input id="address_line_1" name="address_line_1" placeholder="e.g. Flat B, 15/F, 41 Conduit Road, Mid-Levels, Hong Kong" defaultValue={student?.address_line_1 ?? ""} />
          </Field>
          <Field id="chinese_address" label="Address in Chinese" className="@md:col-span-2 @3xl:col-span-3">
            <Input id="chinese_address" name="chinese_address" placeholder="中文地址" defaultValue={student?.chinese_address ?? ""} />
          </Field>
        </div>
      </FormBlock>

      <FormBlock title="School and course">
        <div className={GRID}>
          <Field id="present_school" label="Current school" className="@md:col-span-2">
            <PresentSchoolPicker
              id="present_school"
              schools={presentSchools}
              value={student?.present_school_id ?? null}
              legacyText={student?.present_school ?? ""}
              canAdd={canWrite}
              onAddingChange={setAddingSchool}
            />
          </Field>
          <Field id="present_school_type_id" label="School type">
            <Select name="present_school_type_id" defaultValue={student?.school_type?.id?.toString() ?? ""}>
              <SelectTrigger id="present_school_type_id" className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {schoolTypes.map(type => <SelectItem key={type.id} value={type.id.toString()}>{type.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field id="course_id" label="Course applying for">
            <Select name="course_id" defaultValue={student?.course?.id?.toString() ?? ""}>
              <SelectTrigger id="course_id" className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {courses.map(course => <SelectItem key={course.id} value={course.id.toString()}>{course.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field id="entry_year" label="Entry year">
            <Select name="entry_year" defaultValue={student?.entry_year?.toString() ?? ""}>
              <SelectTrigger id="entry_year" className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {entryYears(student?.entry_year).map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field id="entry_month" label="Entry month">
            <Select name="entry_month" defaultValue={student?.entry_month?.toString() ?? ""}>
              <SelectTrigger id="entry_month" className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </FormBlock>

      <FormBlock title="With Academic Asia" description="Where the student stands with us, who looks after them and how they found us.">
        <div className={GRID}>
          <Field id="status_id" label="Status" hint="New enquiry, active client, on hold (pending), closed or lost (dead).">
            <Select name="status_id" defaultValue={student?.status?.id?.toString() ?? statuses.find(s => s.code === "new")?.id?.toString() ?? ""}>
              <SelectTrigger id="status_id" className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {statuses.map(status => <SelectItem key={status.id} value={status.id.toString()}>{status.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field id="placement_id" label="Lead" hint="How likely the family is to go ahead, from cold to very hot.">
            <Select name="placement_id" defaultValue={student?.placement?.id?.toString() ?? placements.find(p => p.code === "cold")?.id?.toString() ?? ""}>
              <SelectTrigger id="placement_id" className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {placements.map(placement => <SelectItem key={placement.id} value={placement.id.toString()}>{placement.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field id="assigned_to" label="Consultant" hint="The member of staff who looks after this student.">
            <Select name="assigned_to" defaultValue={student?.assigned_to ?? ""}>
              <SelectTrigger id="assigned_to" className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {profiles.map(p => <SelectItem key={p.id} value={p.id}>{[p.first_name, p.surname].filter(Boolean).join(" ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field id="lead_source" label="How they found us">
            <Select value={leadCategory} onValueChange={setLeadCategory}>
              <SelectTrigger id="lead_source" className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="walk_in">Walk-in</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="events">Event</SelectItem>
                <SelectItem value="direct">Direct</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {leadCategory === "referral" && (
            <Field id="lead_source_referral_detail" label="Referred by">
              <Input id="lead_source_referral_detail" name="lead_source_referral_detail" defaultValue={student?.lead_source_referral_detail ?? ""} placeholder="Who referred them?" />
            </Field>
          )}
          {leadCategory === "events" && (
            <Field id="lead_source_event_id" label="Event">
              <Select name="lead_source_event_id" defaultValue={student?.lead_source_event_id ?? ""}>
                <SelectTrigger id="lead_source_event_id" className="w-full"><SelectValue placeholder="Select event" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {events.map(evt => <SelectItem key={evt.id} value={evt.id}>{evt.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field id="enrollment_date" label="Enrolled with us" hint="Leave empty until the family signs up.">
            <DateField id="enrollment_date" name="enrollment_date" defaultValue={student?.enrollment_date ?? null} placeholder="Not enrolled yet" />
          </Field>
          <Field id="exam_paper" label="Exam paper" className="@md:col-span-2 @3xl:col-span-3" hint="The entrance paper level the student sits, with the paper attached if you have it.">
            <Input id="exam_paper" name="exam_paper" placeholder="e.g. Year 12" defaultValue={student?.exam_paper ?? ""} />
            <AttachmentField
              ref={attachRef}
              attachPoint="student_exam_paper"
              ownerId={student?.id ?? ""}
              attachableId={mode === "edit" ? student?.id ?? null : null}
              attachments={examPaperAttachments}
              canWrite={canWrite}
            />
          </Field>
        </div>
      </FormBlock>

      <FormBlock title="Preferences and notes">
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            {/* Opt in: nobody is put on the newsletter without being asked. */}
            <Checkbox id="aa_news" name="aa_news" defaultChecked={student?.aa_news ?? false} />
            <Label htmlFor="aa_news" className="text-sm font-normal">Receives the Academic Asia newsletter</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="airport_pickup" name="airport_pickup" defaultChecked={student?.airport_pickup ?? false} />
            <Label htmlFor="airport_pickup" className="text-sm font-normal">Needs an airport pickup</Label>
          </div>
        </div>
        <Field id="remarks" label="Remarks">
          <Textarea id="remarks" name="remarks" placeholder="Anything else staff should know" rows={4} defaultValue={student?.remarks ?? ""} />
        </Field>
      </FormBlock>

      {/* Form Actions: kept in view at the foot, so Save never needs a scroll */}
      <div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-end gap-3 border-t bg-background/95 px-1 py-3 backdrop-blur">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        ) : (
          <Button type="button" variant="outline" asChild>
            <Link href={student?.id ? `/students/${student.id}` : "/students"}>
              Cancel
            </Link>
          </Button>
        )}
        <Button type="submit" disabled={isPending || addingSchool} className="gap-2">
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {mode === "create" ? "Creating..." : "Saving..."}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {mode === "create" ? "Create Student" : "Save Changes"}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
