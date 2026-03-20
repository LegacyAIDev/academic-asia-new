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
import { Loader2, Trash2, Plus, GraduationCap, CalendarDays } from "lucide-react"
import { deleteIndividualExam } from "@/lib/supabase/actions/student-individual-exams"
import { NewExamForm } from "./application-exam-form"

export type ExamItem = {
  id: string
  subject: string | null
  apply_year: string | null
  delivery_mode_id: number | null
  preferred_date: string | null
  preferred_start_time: string | null
  confirmed_date: string | null
  confirmed_start_time: string | null
  room: string | null
  seat_no: number | null
  score: number | null
  remarks: string | null
  status_id: number
}

type Props = {
  applicationId: string
  studentId: string
  schoolId: string
  exams: ExamItem[]
  isCreate?: boolean
  defaultYear?: string
  examPrefDate?: Date | undefined
  onExamPrefDateChange?: (d: Date | undefined) => void
}

const inputStyles = "h-9 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-sm"
const YEARS = Array.from({ length: 13 }, (_, i) => String(i + 1))
const DELIVERY_LABELS: Record<number, string> = { 1: "In Person", 2: "Online", 3: "Hybrid" }

function formatDate(val: string | null) {
  if (!val) return "—"
  return new Date(val + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

/** Single exam row showing booking + confirmation details */
function ExamRow({ exam, studentId }: { exam: ExamItem; studentId: string }) {
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (!confirm("Delete this exam booking?")) return
    startTransition(async () => {
      await deleteIndividualExam(exam.id, studentId)
    })
  }

  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-sm space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <span className="font-medium">{exam.subject || "—"}</span>
          <span className="text-muted-foreground">Year {exam.apply_year || "—"}</span>
          <span className="text-muted-foreground">{DELIVERY_LABELS[exam.delivery_mode_id ?? 0] ?? "—"}</span>
          <span className="text-muted-foreground">{formatDate(exam.preferred_date)}{exam.preferred_start_time ? ` ${exam.preferred_start_time}` : ""}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onClick={handleDelete} disabled={isPending}>
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
        </Button>
      </div>
      {/* Confirmation row */}
      {(exam.confirmed_date || exam.room || exam.seat_no != null || exam.score != null) && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground pl-1 border-t pt-1">
          {exam.confirmed_date && <span>Confirmed: {formatDate(exam.confirmed_date)}{exam.confirmed_start_time ? ` ${exam.confirmed_start_time}` : ""}</span>}
          {exam.room && <span>Room: {exam.room}</span>}
          {exam.seat_no != null && <span>Seat: {exam.seat_no}</span>}
          {exam.score != null && <span className="font-medium text-foreground">Score: {exam.score}</span>}
        </div>
      )}
      {exam.remarks && <p className="text-xs text-muted-foreground pl-1">{exam.remarks}</p>}
    </div>
  )
}

/** Exam booking section — inline fields for create, list+add for edit */
export function ApplicationExamSection({
  applicationId, studentId, schoolId, exams, isCreate, defaultYear,
  examPrefDate, onExamPrefDateChange,
}: Props) {
  const [showForm, setShowForm] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)

  const formatDateDisplay = (date: Date | undefined) =>
    date ? date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null

  return (
    <div className="group">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-500/5 text-violet-600">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-foreground">
              Entrance Exam Booking {!isCreate && `(${exams.length})`}
            </span>
          </div>
          {!isCreate && !showForm && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowForm(true)}>
              <Plus className="h-3 w-3" /> Add Exam
            </Button>
          )}
        </div>

        {/* Create mode: inline booking request fields */}
        {isCreate && (
          <div className="space-y-3">
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
                      {formatDateDisplay(examPrefDate) ?? <span className="text-muted-foreground">Select</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                    <CalendarComponent mode="single" selected={examPrefDate} onSelect={(d) => { onExamPrefDateChange?.(d); setDateOpen(false) }} />
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
          </div>
        )}

        {/* Edit mode: existing exams list + add form */}
        {!isCreate && (
          <div className="space-y-2">
            {exams.map((ex) => (
              <ExamRow key={ex.id} exam={ex} studentId={studentId} />
            ))}
            {exams.length === 0 && !showForm && (
              <p className="text-sm text-muted-foreground text-center py-3">No exam bookings</p>
            )}
            {showForm && (
              <NewExamForm
                applicationId={applicationId}
                studentId={studentId}
                schoolId={schoolId}
                defaultYear={defaultYear}
                onDone={() => setShowForm(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
