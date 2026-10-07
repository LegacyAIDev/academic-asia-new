"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Pencil, Loader2, MapPin } from "lucide-react"
import { toast } from "sonner"
import { createLocation, updateLocation } from "@/lib/supabase/actions/scheduler-locations"
import { locationFormSchema } from "@/lib/scheduler/room-schema"
import type { SchedulerLocation } from "@/lib/supabase/queries/scheduler-rooms"

type LocationDialogProps = {
  mode: "create" | "edit"
  location?: SchedulerLocation
  trigger?: React.ReactNode
}

/** Create/edit dialog for a location, opened from the "Manage locations" panel. */
export function LocationDialog({ mode, location, trigger }: LocationDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

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
      const result = mode === "create"
        ? await createLocation(parsed.data)
        : await updateLocation(location!.id, parsed.data)

      if (result.success) {
        toast.success(mode === "create" ? "Location created" : "Location updated")
        setOpen(false)
        router.refresh()
      } else {
        setError(result.error ?? "Failed to save location")
      }
    })
  }

  const inputStyles = "h-9 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20"

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setError(null) }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Add location
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {mode === "create" ? "New Location" : "Edit Location"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Name *</Label>
            <Input name="name" className={inputStyles} defaultValue={location?.name ?? ""} placeholder="e.g. Central Office" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Building</Label>
            <Input name="building" className={inputStyles} defaultValue={location?.building ?? ""} placeholder="e.g. Tower A" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Address</Label>
            <Input name="address" className={inputStyles} defaultValue={location?.address ?? ""} placeholder="Street address" />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="min-w-[120px] gap-2">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "create" ? "Create location" : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Edit trigger for an existing location row. */
export function EditLocationButton({ location }: { location: SchedulerLocation }) {
  return (
    <LocationDialog
      mode="edit"
      location={location}
      trigger={
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Edit location">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      }
    />
  )
}
