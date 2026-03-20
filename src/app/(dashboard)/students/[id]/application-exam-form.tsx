"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Plus, Loader2, CalendarDays } from "lucide-react"
import { createIndividualExam } from "@/lib/supabase/actions/student-individual-exams"

const inputStyles = "h-9 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-sm"
const YEARS = Array.from({ length: 13 }, (_, i) => String(i + 1))
const ENTRANCE_EXAM_TYPE_ID = 2

function formatDateDisplay(date: Date | undefined) {
  return date ? date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null
}

function formatDateValue(date: Date | undefined) {
  return date ? date.toISOString().split("T")[0] : null
}

type Props = {
  applicationId: string
  studentId: string
  schoolId: string
  defaultYear?: string
  onDone: () => void
}

/** Form for adding a new exam booking to an existing application */
export function NewExamForm({ applicationId, studentId, schoolId, defaultYear, onDone }: Props) {
  const [isPending, startTransition] = useTransition()
  const [prefDate, setPrefDate] = useState<Date | undefined>(undefined)
  const [dateOpen, setDateOpen] = useState(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      await createIndividualExam({
        student_id: studentId,
        school_id: schoolId,
        application_id: applicationId,
        exam_type_id: ENTRANCE_EXAM_TYPE_ID,
        subject: (fd.get("exam_subject") as string) || null,
        apply_year: (fd.get("exam_year") as string) || null,
        delivery_mode_id: fd.get("exam_method") ? parseInt(fd.get("exam_method") as string, 10) : null,
        preferred_date: formatDateValue(prefDate),
        preferred_start_time: (fd.get("exam_pref_time") as string) || null,
        remarks: (fd.get("exam_remarks") as string) || null,
        status_id: 1,
      }, studentId)
      onDone()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-dashed border-violet-300 bg-violet-50/50 dark:bg-violet-950/20 p-3 space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Subject</Label>
          <Input name="exam_subject" className={inputStyles} placeholder="e.g. Maths" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Year</Label>
          <Select name="exam_year" defaultValue={defaultYear ?? ""}>
            <SelectTrigger className={inputStyles}><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => <SelectItem key={y} value={y}>Year {y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Method</Label>
          <Select name="exam_method" defaultValue="1">
            <SelectTrigger className={inputStyles}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">In Person</SelectItem>
              <SelectItem value="2">Online</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Preferred Date</Label>
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className={`w-full justify-start font-normal ${inputStyles}`}>
                <CalendarDays className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                {formatDateDisplay(prefDate) ?? <span className="text-muted-foreground">Select</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto overflow-hidden p-0" align="start">
              <CalendarComponent mode="single" selected={prefDate} onSelect={(d) => { setPrefDate(d); setDateOpen(false) }} />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Preferred Time</Label>
          <Input name="exam_pref_time" type="time" className={inputStyles} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Remarks</Label>
          <Input name="exam_remarks" className={inputStyles} placeholder="Notes..." />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone} className="text-xs h-8">Cancel</Button>
        <Button type="submit" size="sm" disabled={isPending} className="text-xs h-8 gap-1">
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          Add Exam
        </Button>
      </div>
    </form>
  )
}
