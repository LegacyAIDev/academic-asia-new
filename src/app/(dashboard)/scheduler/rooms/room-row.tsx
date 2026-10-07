"use client"

import { Accessibility, CalendarCheck, Monitor, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { RoomChip } from "@/components/scheduler/room-chip"
import { EditRoomButton } from "./room-dialog"
import { DeleteRoomButton, ToggleActiveButton } from "./room-row-actions"
import type { SchedulerRoom, SchedulerLocation } from "@/lib/supabase/queries/scheduler-rooms"

/** One location as a card: address eyebrow, name, then its rooms as rows. */
export function RoomGroup({ location, rooms, canManage, locations }: {
  location: SchedulerLocation; rooms: SchedulerRoom[]; canManage: boolean; locations: SchedulerLocation[]
}) {
  const eyebrow = [location.building, location.address].filter(Boolean).join(" · ")
  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <header className="flex flex-wrap items-end justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          {eyebrow && <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{eyebrow}</p>}
          <h2 className={cn("text-sm font-semibold", !location.is_active && "text-muted-foreground line-through")}>{location.name}</h2>
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">{rooms.length} room{rooms.length === 1 ? "" : "s"}</p>
      </header>
      <ul className="divide-y divide-border">
        {rooms.map(room => (
          <RoomRow key={room.id} room={room} canManage={canManage} locations={locations} />
        ))}
      </ul>
    </section>
  )
}

function FacilityBadge({ icon: Icon, children }: { icon: typeof Users; children: React.ReactNode }) {
  return (
    <Badge variant="outline" className="h-6 gap-1 px-1.5 text-[11px] font-medium text-muted-foreground">
      <Icon className="h-3 w-3" aria-hidden />
      {children}
    </Badge>
  )
}

function RoomRow({ room, canManage, locations }: { room: SchedulerRoom; canManage: boolean; locations: SchedulerLocation[] }) {
  const inactive = !room.is_active
  return (
    <li className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3", inactive && "bg-muted/40 text-muted-foreground")}>
      <div className={cn("flex min-w-0 flex-1 basis-[200px] items-center gap-2", inactive && "line-through opacity-70")}>
        <RoomChip display_name={room.display_name} floor={room.floor} room_number={room.room_number} />
        {room.color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: room.color }} aria-hidden />}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <FacilityBadge icon={Users}><span className="tabular-nums">{room.capacity}</span> seats</FacilityBadge>
        {room.is_exam_suitable && <FacilityBadge icon={CalendarCheck}>Exam suitable</FacilityBadge>}
        {room.is_accessible && <FacilityBadge icon={Accessibility}>Accessible</FacilityBadge>}
        {room.online_station_count > 0 && (
          <FacilityBadge icon={Monitor}><span className="tabular-nums">{room.online_station_count}</span> online stations</FacilityBadge>
        )}
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className="text-xs text-muted-foreground tabular-nums">
          {room.booking_count} booking{room.booking_count === 1 ? "" : "s"}
        </span>
        {inactive && <Badge variant="outline" className="text-[11px] text-muted-foreground">Inactive</Badge>}
        {canManage && (
          <div className="flex items-center">
            <EditRoomButton room={room} locations={locations} />
            <ToggleActiveButton room={room} />
            <DeleteRoomButton room={room} />
          </div>
        )}
      </div>
    </li>
  )
}
