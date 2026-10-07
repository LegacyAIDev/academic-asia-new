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
import { Plus, Pencil, Loader2, DoorOpen } from "lucide-react"
import { toast } from "sonner"
import { createRoom, updateRoom } from "@/lib/supabase/actions/scheduler-rooms"
import { roomFormSchema } from "@/lib/scheduler/room-schema"
import { RoomFormFields } from "./room-form-fields"
import type { SchedulerRoom, SchedulerLocation } from "@/lib/supabase/queries/scheduler-rooms"

type RoomDialogProps = {
  locations: SchedulerLocation[]
  mode: "create" | "edit"
  room?: SchedulerRoom
  trigger?: React.ReactNode
}

/** Create/edit dialog shared by the "New room" button and each row's Edit action. */
export function RoomDialog({ locations, mode, room, trigger }: RoomDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [color, setColor] = useState<string | null>(room?.color ?? null)
  const [isExamSuitable, setIsExamSuitable] = useState(room?.is_exam_suitable ?? false)
  const [isAccessible, setIsAccessible] = useState(room?.is_accessible ?? false)
  const [isActive, setIsActive] = useState(room?.is_active ?? true)

  const selectableLocations = locations.filter(l => l.is_active || l.id === room?.location_id)

  const resetState = () => {
    setColor(room?.color ?? null)
    setIsExamSuitable(room?.is_exam_suitable ?? false)
    setIsAccessible(room?.is_accessible ?? false)
    setIsActive(room?.is_active ?? true)
    setError(null)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const raw = {
      display_name: formData.get("display_name") as string,
      location_id: formData.get("location_id") as string,
      floor: (formData.get("floor") as string) || null,
      room_number: (formData.get("room_number") as string) || null,
      capacity: formData.get("capacity") as string,
      is_exam_suitable: isExamSuitable,
      online_station_count: formData.get("online_station_count") as string,
      is_accessible: isAccessible,
      facilities_notes: (formData.get("facilities_notes") as string) || null,
      color,
      is_active: isActive,
    }

    const parsed = roomFormSchema.safeParse(raw)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form for errors")
      return
    }

    startTransition(async () => {
      const result = mode === "create"
        ? await createRoom(parsed.data)
        : await updateRoom(room!.id, parsed.data)

      if (result.success) {
        toast.success(mode === "create" ? "Room created" : "Room updated")
        setOpen(false)
        router.refresh()
      } else {
        setError(result.error ?? "Failed to save room")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) resetState() }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="h-9 gap-2">
            <Plus className="h-4 w-4" />
            New room
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DoorOpen className="h-5 w-5 text-primary" />
            {mode === "create" ? "New Room" : "Edit Room"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <RoomFormFields
            room={room}
            mode={mode}
            selectableLocations={selectableLocations}
            color={color}
            setColor={setColor}
            isExamSuitable={isExamSuitable}
            setIsExamSuitable={setIsExamSuitable}
            isAccessible={isAccessible}
            setIsAccessible={setIsAccessible}
            isActive={isActive}
            setIsActive={setIsActive}
          />

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="min-w-[120px] gap-2">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "create" ? "Create room" : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Edit trigger for an existing room row. */
export function EditRoomButton({ room, locations }: { room: SchedulerRoom; locations: SchedulerLocation[] }) {
  return (
    <RoomDialog
      mode="edit"
      room={room}
      locations={locations}
      trigger={
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary" title="Edit room" aria-label="Edit room">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      }
    />
  )
}
