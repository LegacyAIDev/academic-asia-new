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
import { Switch } from "@/components/ui/switch"
import { Loader2, MapPin } from "lucide-react"
import { toast } from "sonner"
import { setLocationActive } from "@/lib/supabase/actions/scheduler-locations"
import { LocationDialog, EditLocationButton } from "./location-dialog"
import type { SchedulerLocation } from "@/lib/supabase/queries/scheduler-rooms"

/** "Manage locations" dialog — a lightweight list with inline add/edit/toggle. */
export function LocationsPanel({ locations }: { locations: SchedulerLocation[] }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-9 gap-2">
          <MapPin className="h-4 w-4" />
          Manage locations
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Locations
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {locations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No locations yet.</p>
          ) : (
            locations.map((location) => <LocationRow key={location.id} location={location} />)
          )}
        </div>

        <div className="border-t border-border pt-4">
          <LocationDialog mode="create" trigger={
            <Button size="sm" variant="outline" className="w-full gap-2">Add location</Button>
          } />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function LocationRow({ location }: { location: SchedulerLocation }) {
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
    <div className={`flex items-center justify-between rounded-lg border border-border px-3 py-2.5 ${!location.is_active ? "opacity-60" : ""}`}>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{location.name}</p>
        {(location.building || location.address) && (
          <p className="text-xs text-muted-foreground truncate">
            {[location.building, location.address].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Switch checked={location.is_active} onCheckedChange={handleToggle} title="Active" />
        )}
        <EditLocationButton location={location} />
      </div>
    </div>
  )
}
