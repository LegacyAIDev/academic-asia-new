"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FileText } from "lucide-react"
import type { EventData } from "./event-form-types"

type Props = {
  event?: EventData | null
}

export function EventFormRemarksSection({ event }: Props) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Notes & Remarks
        </CardTitle>
        <CardDescription>Additional information about this event</CardDescription>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  )
}
