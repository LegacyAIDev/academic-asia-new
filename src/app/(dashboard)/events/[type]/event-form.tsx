"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Save,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Loader2,
} from "lucide-react"
import { createEvent, updateEvent, type CreateEventInput } from "@/lib/supabase/actions/events"

type EventType = {
  id: number
  code: string
  label: string
  color: string | null
}

type Profile = {
  id: string
  first_name: string | null
  surname: string | null
}

type EventData = {
  id: string
  event_type_id: number
  name: string
  location: string | null
  start_date: string | null
  end_date: string | null
  start_time: string | null
  end_time: string | null
  duration_minutes: number | null
  remarks: string | null
  assigned_to: string | null
}

export type EventFormProps = {
  mode: "create" | "edit"
  eventType: string
  eventTypeId: number
  event?: EventData | null
  eventTypes: EventType[]
  profiles: Profile[]
}

export function EventForm({ mode, eventType, eventTypeId, event, eventTypes, profiles }: EventFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    const assignedTo = formData.get("assigned_to") as string
    const input: CreateEventInput = {
      event_type_id: parseInt(formData.get("event_type_id") as string, 10),
      name: formData.get("name") as string,
      location: (formData.get("location") as string) || null,
      start_date: (formData.get("start_date") as string) || null,
      end_date: (formData.get("end_date") as string) || null,
      start_time: (formData.get("start_time") as string) || null,
      end_time: (formData.get("end_time") as string) || null,
      duration_minutes: formData.get("duration_minutes") ? parseInt(formData.get("duration_minutes") as string, 10) : null,
      remarks: (formData.get("remarks") as string) || null,
      assigned_to: assignedTo === "unassigned" ? null : assignedTo || null,
    }

    startTransition(async () => {
      let result
      if (mode === "create") {
        result = await createEvent(input)
      } else if (event?.id) {
        result = await updateEvent(event.id, input)
      }

      if (result?.success) {
        if (mode === "create" && result.data?.id) {
          router.push(`/events/${eventType}/${result.data.id}`)
        } else if (event?.id) {
          router.push(`/events/${eventType}/${event.id}`)
        } else {
          router.push(`/events/${eventType}`)
        }
      } else {
        setError(result?.error ?? "An error occurred")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Basic Information */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Basic Information
          </CardTitle>
          <CardDescription>Core details about the event</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">
                Event Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. UK Education Expo 2024"
                required
                defaultValue={event?.name ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event_type_id">Event Type</Label>
              <Select name="event_type_id" defaultValue={event?.event_type_id?.toString() ?? eventTypeId.toString()}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">
              <span className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                Location / Description
              </span>
            </Label>
            <Textarea
              id="location"
              name="location"
              placeholder="Enter venue address, room details, or virtual meeting link..."
              rows={3}
              defaultValue={event?.location ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigned_to">Assigned Staff</Label>
            <Select name="assigned_to" defaultValue={event?.assigned_to ?? "unassigned"}>
              <SelectTrigger>
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.first_name} {profile.surname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Date & Time */}
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
              <Input
                id="start_date"
                name="start_date"
                type="date"
                defaultValue={event?.start_date ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                name="end_date"
                type="date"
                defaultValue={event?.end_date ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration_minutes">Duration (Minutes)</Label>
              <Input
                id="duration_minutes"
                name="duration_minutes"
                type="number"
                min="0"
                step="5"
                placeholder="e.g. 30"
                defaultValue={event?.duration_minutes ?? ""}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time</Label>
              <Input
                id="start_time"
                name="start_time"
                type="time"
                defaultValue={event?.start_time?.slice(0, 5) ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">End Time</Label>
              <Input
                id="end_time"
                name="end_time"
                type="time"
                defaultValue={event?.end_time?.slice(0, 5) ?? ""}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Remarks */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Additional Notes
          </CardTitle>
          <CardDescription>Any extra information about the event</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              name="remarks"
              placeholder="Add any notes, special instructions, or additional details..."
              rows={4}
              defaultValue={event?.remarks ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        <Button variant="outline" type="button" asChild>
          <Link href={event?.id ? `/events/${eventType}/${event.id}` : `/events/${eventType}`}>
            Cancel
          </Link>
        </Button>
        <Button type="submit" disabled={isPending} className="gap-2">
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {mode === "create" ? "Creating..." : "Saving..."}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {mode === "create" ? "Create Event" : "Save Changes"}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
