"use client"

import { EventFormSection } from "./event-form-section"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { EventData } from "./event-form-types"
import { inputStyles } from "./event-form-types"

type Props = {
  showOnlineLink: boolean
  event?: EventData | null
}

export function EventFormLocationSection({ showOnlineLink, event }: Props) {
  return (
    <EventFormSection id="where" title="Location & capacity" description="Venue details and capacity limits">
        <div className="space-y-2">
          <Label htmlFor="location">Location / Venue</Label>
          <Textarea id="location" name="location" rows={2} placeholder="Enter venue address, room details..." defaultValue={event?.location ?? ""} />
        </div>
        {showOnlineLink && (
          <div className="space-y-2">
            <Label htmlFor="online_link">Online Meeting Link</Label>
            <Input id="online_link" name="online_link" type="url" className={inputStyles} placeholder="https://zoom.us/j/..." defaultValue={event?.online_link ?? ""} />
          </div>
        )}
        <div className="space-y-2 max-w-xs">
          <Label htmlFor="capacity">Capacity / Seats</Label>
          <Input id="capacity" name="capacity" type="number" min="0" className={inputStyles} placeholder="e.g. 100" defaultValue={event?.capacity ?? ""} />
        </div>
      </EventFormSection>
  )
}
