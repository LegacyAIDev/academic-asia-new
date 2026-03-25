"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Plus, Loader2, ClipboardList, Check } from "lucide-react"

import { createAATestBooking } from "@/lib/supabase/actions/student-resume-aa-tests"
import type { IndividualExamRecord } from "@/lib/supabase/queries/student-individual-exams"

type Props = { studentId: string; aaTests: IndividualExamRecord[] }

function formatDate(d: string | null) {
  if (!d) return "—"
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

export function ResumeAATestsSection({ studentId, aaTests }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const seatRaw = fd.get("seat_no") as string
      const scoreRaw = fd.get("score") as string
      const result = await createAATestBooking({
        student_id: studentId,
        exam_type_id: 1,
        subject: (fd.get("subject") as string) || null,
        apply_year: (fd.get("apply_year") as string) || null,
        preferred_date: (fd.get("preferred_date") as string) || null,
        preferred_start_time: (fd.get("preferred_start_time") as string) || null,
        confirmed_date: (fd.get("confirmed_date") as string) || null,
        confirmed_start_time: (fd.get("confirmed_start_time") as string) || null,
        room: (fd.get("room") as string) || null,
        seat_no: seatRaw ? Number(seatRaw) : null,
        score: scoreRaw ? Number(scoreRaw) : null,
        remarks: (fd.get("remarks") as string) || null,
      })
      if (result?.success) setShowForm(false)
      else setError(result?.error ?? "Failed to book AA Test")
    })
  }

  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">AA Test Results</span>
          {aaTests.length > 0 && <Badge variant="secondary" className="text-xs">{aaTests.length}</Badge>}
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3 w-3" /> Book AA Test
        </Button>
      </div>

      {aaTests.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground text-center py-2">No AA tests booked</p>
      )}

      {aaTests.map((t) => (
          <div key={t.id} className="text-sm bg-background rounded-lg p-3 border border-border/50 space-y-2">
            <span className="font-medium">{t.subject || "Untitled"}</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div><span className="text-xs text-muted-foreground">Year</span><p>{t.apply_year || "—"}</p></div>
              <div><span className="text-xs text-muted-foreground">Confirmed Date</span><p>{formatDate(t.confirmed_date)}</p></div>
              <div><span className="text-xs text-muted-foreground">Confirmed Time</span><p>{t.confirmed_start_time || "—"}</p></div>
              <div><span className="text-xs text-muted-foreground">Room</span><p>{t.room || "—"}</p></div>
              <div><span className="text-xs text-muted-foreground">Seat No.</span><p>{t.seat_no ?? "—"}</p></div>
              <div><span className="text-xs text-muted-foreground">Score</span><p className="font-medium">{t.score ?? "—"}</p></div>
              <div><span className="text-xs text-muted-foreground">Preferred Date</span><p>{formatDate(t.preferred_date)}</p></div>
              <div><span className="text-xs text-muted-foreground">Preferred Time</span><p>{t.preferred_start_time || "—"}</p></div>
            </div>
            {t.remarks && <p className="text-xs text-muted-foreground">{t.remarks}</p>}
          </div>
      ))}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-background rounded-lg p-4 border border-border/50 space-y-3">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Subject</Label>
              <Input name="subject" className="h-9 text-sm" placeholder="e.g. English" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Year</Label>
              <Select name="apply_year" defaultValue="7">
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 13 }, (_, i) => i + 1).map(y => (
                    <SelectItem key={y} value={y.toString()}>Year {y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Preferred Date</Label>
              <Input name="preferred_date" type="date" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Preferred Time</Label>
              <Input name="preferred_start_time" type="time" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Confirmed Date</Label>
              <Input name="confirmed_date" type="date" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Confirmed Time</Label>
              <Input name="confirmed_start_time" type="time" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Room</Label>
              <Input name="room" className="h-9 text-sm" placeholder="e.g. Room A1" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Seat No.</Label>
              <Input name="seat_no" type="number" className="h-9 text-sm" placeholder="e.g. 12" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Score</Label>
              <Input name="score" type="number" className="h-9 text-sm" placeholder="e.g. 85" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Remarks</Label>
            <Textarea name="remarks" rows={2} className="resize-none text-sm" placeholder="Notes..." />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={isPending} className="gap-1">
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Book
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
