"use client"

import { useMemo, useState } from "react"
import { DoorOpen, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { RoomDialog } from "./room-dialog"
import { LocationsPanel } from "./locations-panel"
import { RoomGroup } from "./room-row"
import type { SchedulerRoom, SchedulerLocation } from "@/lib/supabase/queries/scheduler-rooms"

type Props = {
  rooms: SchedulerRoom[]
  locations: SchedulerLocation[]
  canManage: boolean
}

/** Rooms grouped into one card per location, with location + inactive filters and admin actions. */
export function RoomsTable({ rooms, locations, canManage }: Props) {
  const [selectedLocationId, setSelectedLocationId] = useState("all")
  const [showInactive, setShowInactive] = useState(false)

  const groups = useMemo(() => {
    const filtered = rooms.filter(r =>
      (showInactive || r.is_active) &&
      (selectedLocationId === "all" || r.location_id === selectedLocationId)
    )
    return locations
      .map(loc => ({ loc, rooms: filtered.filter(r => r.location_id === loc.id) }))
      .filter(g => g.rooms.length > 0)
  }, [rooms, locations, selectedLocationId, showInactive])

  const nothingYet = rooms.length === 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-2 shadow-sm sm:p-3">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
            <SelectTrigger className="h-9 w-[180px] rounded-full text-xs" aria-label="Location">
              <SelectValue placeholder="All locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              {locations.map(loc => (
                <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex h-9 items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={showInactive} onCheckedChange={setShowInactive} />
            Show inactive
          </label>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <LocationsPanel locations={locations} />
            <RoomDialog mode="create" locations={locations} />
          </div>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center">
          <DoorOpen className="h-6 w-6 text-muted-foreground" aria-hidden />
          <div>
            <p className="text-sm font-semibold">{nothingYet ? "No rooms yet" : "No rooms match this filter"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {nothingYet ? "Add your first room so exams and meetings have somewhere to go." : "Try another location or show inactive rooms."}
            </p>
          </div>
          {nothingYet && canManage && (
            <RoomDialog mode="create" locations={locations} trigger={
              <Button size="sm" className="h-9 gap-2"><Plus className="h-4 w-4" /> Add your first room</Button>
            } />
          )}
        </div>
      ) : (
        groups.map(({ loc, rooms: groupRooms }) => (
          <RoomGroup key={loc.id} location={loc} rooms={groupRooms} canManage={canManage} locations={locations} />
        ))
      )}
    </div>
  )
}
