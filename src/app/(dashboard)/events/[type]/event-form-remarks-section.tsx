"use client"

import { EventFormSection } from "./event-form-section"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { EventData } from "./event-form-types"

type Props = {
  event?: EventData | null
}

export function EventFormRemarksSection({ event }: Props) {
  return (
    <EventFormSection id="remarks" title="Notes & remarks" description="Additional information about this event">
        <div className="space-y-2">
          <Label htmlFor="remarks">Remarks</Label>
          <Textarea
            id="remarks"
            name="remarks"
            rows={4}
            placeholder="Add any notes, special instructions, or additional details..."
            defaultValue={event?.remarks ?? ""}
          />
        </div>
      </EventFormSection>
  )
}
