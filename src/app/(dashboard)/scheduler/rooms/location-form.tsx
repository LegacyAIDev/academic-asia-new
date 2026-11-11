"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createLocation, updateLocation } from "@/lib/supabase/actions/scheduler-locations"
import { locationFormSchema } from "@/lib/scheduler/room-schema"
import type { SchedulerLocation } from "@/lib/supabase/queries/scheduler-rooms"

/** Add or edit one location, inline inside the Locations drawer. */
export function LocationForm({ location, onDone }: { location?: SchedulerLocation; onDone: () => void }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const isEditing = Boolean(location)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const raw = {
      name: formData.get("name") as string,
      address: (formData.get("address") as string) || null,
      building: (formData.get("building") as string) || null,
      is_active: location?.is_active ?? true,
    }

    const parsed = locationFormSchema.safeParse(raw)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form for errors")
      return
    }

    startTransition(async () => {
      const result = isEditing ? await updateLocation(location!.id, parsed.data) : await createLocation(parsed.data)
      if (result.success) {
        toast.success(isEditing ? "Location updated" : "Location created")
        router.refresh()
        onDone()
      } else {
        setError(result.error ?? "Failed to save location")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <p className="text-sm font-semibold">{isEditing ? `Edit ${location!.name}` : "New location"}</p>
      {error && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-sm text-destructive">{error}</div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="location-name" className="text-xs font-medium text-muted-foreground">Name</Label>
        <Input id="location-name" name="name" className="h-9 bg-background" defaultValue={location?.name ?? ""} placeholder="e.g. Central Office" autoFocus />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="location-building" className="text-xs font-medium text-muted-foreground">Building</Label>
          <Input id="location-building" name="building" className="h-9 bg-background" defaultValue={location?.building ?? ""} placeholder="e.g. Tower A" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="location-address" className="text-xs font-medium text-muted-foreground">Address</Label>
          <Input id="location-address" name="address" className="h-9 bg-background" defaultValue={location?.address ?? ""} placeholder="Street address" />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={isPending}>Cancel</Button>
        <Button type="submit" size="sm" disabled={isPending} className="min-w-[110px] gap-2">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isEditing ? "Save changes" : "Add location"}
        </Button>
      </div>
    </form>
  )
}
