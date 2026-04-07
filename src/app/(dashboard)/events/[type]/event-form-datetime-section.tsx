"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Clock } from "lucide-react"
import type { EventData } from "./event-form-types"
import { inputStyles } from "./event-form-types"

type Props = {
  event?: EventData | null
}

/** Date & time section — end date defaults to start date on selection */
export function EventFormDateTimeSection({ event }: Props) {
  const [startDate, setStartDate] = useState(event?.start_date ?? "")
  const [endDate, setEndDate] = useState(event?.end_date ?? "")

  const handleStartDateChange = (val: string) => {
    const prev = startDate
    setStartDate(val)
    if (!endDate || endDate === prev) setEndDate(val)
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Date & Time
        </CardTitle>
        <CardDescription>When the event takes place</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="start_date">Start Date</Label>
            <Input id="start_date" name="start_date" type="date" className={inputStyles}
              value={startDate} onChange={(e) => handleStartDateChange(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end_date">End Date</Label>
            <Input id="end_date" name="end_date" type="date" className={inputStyles}
              value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration_minutes">Duration (Minutes)</Label>
            <Input id="duration_minutes" name="duration_minutes" type="number" min="0" step="5" className={inputStyles} placeholder="e.g. 30" defaultValue={event?.duration_minutes ?? ""} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="start_time">Start Time</Label>
            <Input id="start_time" name="start_time" type="time" className={inputStyles} defaultValue={event?.start_time?.slice(0, 5) ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end_time">End Time</Label>
            <Input id="end_time" name="end_time" type="time" className={inputStyles} defaultValue={event?.end_time?.slice(0, 5) ?? ""} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
