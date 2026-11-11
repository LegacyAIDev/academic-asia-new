"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Loader2, MapPin, Pencil, Plus } from "lucide-react"
import { toast } from "sonner"
import { setLocationActive } from "@/lib/supabase/actions/scheduler-locations"
import { LocationForm } from "./location-form"
import type { SchedulerLocation } from "@/lib/supabase/queries/scheduler-rooms"

/** "Manage locations" side drawer: the list, with adding and editing done in place. */
export function LocationsPanel({ locations }: { locations: SchedulerLocation[] }) {
  const [open, setOpen] = useState(false)
  // "new" while adding, a location id while editing it, null otherwise.
  const [editing, setEditing] = useState<string | null>(null)

  return (
    <Sheet open={open} onOpenChange={v => { setOpen(v); setEditing(null) }}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" className="h-9 gap-2">
          <MapPin className="h-4 w-4" />
          Manage locations
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="sticky top-0 z-20 border-b bg-background px-6 py-4">
          <SheetTitle>Locations</SheetTitle>
          <SheetDescription>The buildings rooms belong to. Switch one off to stop offering its rooms.</SheetDescription>
        </SheetHeader>

        <div className="space-y-2 px-6 py-5">
          {locations.length === 0 && editing !== "new" && (
            <p className="py-4 text-center text-sm text-muted-foreground">No locations yet.</p>
          )}
          {locations.map(location =>
            editing === location.id
              ? <LocationForm key={location.id} location={location} onDone={() => setEditing(null)} />
              : <LocationRow key={location.id} location={location} onEdit={() => setEditing(location.id)} />,
          )}
          {editing === "new" ? (
            <LocationForm onDone={() => setEditing(null)} />
          ) : (
            <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => setEditing("new")}>
              <Plus className="h-4 w-4" /> Add location
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function LocationRow({ location, onEdit }: { location: SchedulerLocation; onEdit: () => void }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleToggle = (active: boolean) => {
    startTransition(async () => {
      const result = await setLocationActive(location.id, active)
      if (result.success) {
        toast.success(active ? "Location reactivated" : "Location deactivated")
        router.refresh()
      } else {
        toast.error(result.error ?? "Failed to update location")
      }
    })
  }

  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${!location.is_active ? "opacity-60" : ""}`}>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{location.name}</p>
        {(location.building || location.address) && (
          <p className="truncate text-xs text-muted-foreground">
            {[location.building, location.address].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Switch checked={location.is_active} onCheckedChange={handleToggle} aria-label={`${location.name} in use`} />
        )}
        <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={onEdit} aria-label={`Edit ${location.name}`}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      </div>
    </div>
  )
}
