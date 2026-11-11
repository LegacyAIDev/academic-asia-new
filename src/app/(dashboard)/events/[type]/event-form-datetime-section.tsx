"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DateField } from "@/components/ui/date-field"
import type { EventData } from "./event-form-types"
import { inputStyles } from "./event-form-types"
import { EventFormSection } from "./event-form-section"

type Props = {
  event?: EventData | null
}

/** Minutes between two "HH:MM" times on one day, or null when either is missing or the end is not later. */
function minutesBetween(start: string, end: string): number | null {
  const toMinutes = (t: string) => (/^\d{2}:\d{2}/.test(t) ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : null)
  const a = toMinutes(start)
  const b = toMinutes(end)
  return a === null || b === null || b <= a ? null : b - a
}

const durationLabel = (minutes: number) =>
  [Math.floor(minutes / 60) && `${Math.floor(minutes / 60)} h`, minutes % 60 && `${minutes % 60} min`].filter(Boolean).join(" ")

/**
 * When the event takes place. The end date follows the start date until it is
 * changed; the duration is worked out from the times, so the two can no longer
 * disagree, and is typed only when no times are given.
 */
export function EventFormDateTimeSection({ event }: Props) {
  const [startDate, setStartDate] = useState<string | null>(event?.start_date ?? null)
  const [endDate, setEndDate] = useState<string | null>(event?.end_date ?? null)
  const [startTime, setStartTime] = useState(event?.start_time?.slice(0, 5) ?? "")
  const [endTime, setEndTime] = useState(event?.end_time?.slice(0, 5) ?? "")
  const worked = minutesBetween(startTime, endTime)

  const changeStart = (value: string | null) => {
    if (!endDate || endDate === startDate) setEndDate(value)
    setStartDate(value)
  }

  return (
    <EventFormSection id="when" title="Date and time" description="When the event takes place">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">Starts on</Label>
          <DateField id="start_date" name="start_date" value={startDate} onChange={changeStart} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">Ends on</Label>
          <DateField id="end_date" name="end_date" value={endDate} onChange={setEndDate} placeholder="Same day" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="start_time">From</Label>
          <Input id="start_time" name="start_time" type="time" className={inputStyles} value={startTime} onChange={e => setStartTime(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_time">To</Label>
          <Input id="end_time" name="end_time" type="time" className={inputStyles} value={endTime} onChange={e => setEndTime(e.target.value)} />
        </div>
      </div>
      {worked !== null ? (
        <p className="text-sm text-muted-foreground">
          <input type="hidden" name="duration_minutes" value={worked} />
          Lasts {durationLabel(worked)}, from the times above.
        </p>
      ) : (
        <div className="max-w-[200px] space-y-2">
          <Label htmlFor="duration_minutes">Duration in minutes</Label>
          <Input id="duration_minutes" name="duration_minutes" type="number" min="0" step="5" className={inputStyles} placeholder="e.g. 30" defaultValue={event?.duration_minutes ?? ""} />
          <p className="text-xs text-muted-foreground">Only needed when there are no start and end times.</p>
        </div>
      )}
    </EventFormSection>
  )
}
