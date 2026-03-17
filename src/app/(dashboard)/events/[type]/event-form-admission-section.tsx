"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { ClipboardList } from "lucide-react"
import type { EventFormReferenceData, EventData } from "./event-form-types"
import { selectTriggerStyles } from "./event-form-types"

type Props = {
  referenceData: EventFormReferenceData
  selectedSchedulingModeId: number | null
  onSchedulingModeChange: (id: number) => void
  event?: EventData | null
}

/** Admission & Assessment specific fields: school, parent event, scheduling mode */
export function EventFormAdmissionSection({
  referenceData, selectedSchedulingModeId, onSchedulingModeChange, event,
}: Props) {
  const { schools, parentEvents, schedulingModes } = referenceData

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          Admission Settings
        </CardTitle>
        <CardDescription>School assignment and scheduling configuration</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>School</Label>
            <Select name="school_id" defaultValue={event?.school_id ?? ""}>
              <SelectTrigger className={selectTriggerStyles}>
                <SelectValue placeholder="Select school" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="none">— None —</SelectItem>
                {schools.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Parent Event</Label>
            <Select name="parent_event_id" defaultValue={event?.parent_event_id ?? ""}>
              <SelectTrigger className={selectTriggerStyles}>
                <SelectValue placeholder="None (standalone)" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="none">— None (standalone) —</SelectItem>
                {parentEvents.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2 max-w-sm">
          <Label>Scheduling Mode</Label>
          <Select
            name="scheduling_mode_id"
            defaultValue={selectedSchedulingModeId?.toString() ?? event?.scheduling_mode_id?.toString() ?? ""}
            onValueChange={(v) => onSchedulingModeChange(parseInt(v, 10))}
          >
            <SelectTrigger className={selectTriggerStyles}>
              <SelectValue placeholder="Select scheduling" />
            </SelectTrigger>
            <SelectContent>
              {schedulingModes.map((sm) => (
                <SelectItem key={sm.id} value={sm.id.toString()}>{sm.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
