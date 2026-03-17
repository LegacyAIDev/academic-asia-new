"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MapPin } from "lucide-react"
import type { EventData } from "./event-form-types"
import { inputStyles } from "./event-form-types"

type Props = {
  showOnlineLink: boolean
  event?: EventData | null
}

export function EventFormLocationSection({ showOnlineLink, event }: Props) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          Location & Capacity
        </CardTitle>
        <CardDescription>Venue details and capacity limits</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
      </CardContent>
    </Card>
  )
}
