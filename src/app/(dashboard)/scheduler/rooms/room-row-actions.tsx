"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Loader2, Trash2, Power, PowerOff } from "lucide-react"
import { toast } from "sonner"
import { setRoomActive, deleteRoom } from "@/lib/supabase/actions/scheduler-rooms"
import type { SchedulerRoom } from "@/lib/supabase/queries/scheduler-rooms"

const ICON_BUTTON = "h-9 w-9 text-muted-foreground"

export function ToggleActiveButton({ room }: { room: SchedulerRoom }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    startTransition(async () => {
      const result = await setRoomActive(room.id, !room.is_active)
      if (result.success) {
        toast.success(room.is_active ? "Room deactivated" : "Room reactivated")
        router.refresh()
      } else {
        toast.error(result.error ?? "Failed to update room")
      }
    })
  }

  const label = room.is_active ? "Deactivate" : "Reactivate"
  return (
    <Button variant="ghost" size="icon" className={`${ICON_BUTTON} hover:text-primary`} onClick={handleToggle} disabled={isPending} title={label} aria-label={label}>
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : room.is_active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
    </Button>
  )
}

export function DeleteRoomButton({ room }: { room: SchedulerRoom }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const inUse = room.booking_count > 0

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteRoom(room.id)
      if (result.success) {
        toast.success("Room deleted")
        setOpen(false)
        router.refresh()
      } else {
        toast.error(result.error ?? "Failed to delete room")
      }
    })
  }

  const trigger = (
    <Button variant="ghost" size="icon" className={`${ICON_BUTTON} hover:text-destructive`} onClick={() => !inUse && setOpen(true)} disabled={inUse} aria-label="Delete room">
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  )

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {inUse ? (
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent>Has {room.booking_count} booking(s) — deactivate instead</TooltipContent>
        </Tooltip>
      ) : trigger}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete room</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong className="text-foreground">{room.display_name}</strong>? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
