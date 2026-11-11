"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { CalendarOff, Loader2, MoreHorizontal, Trash2, Power, PowerOff } from "lucide-react"
import { toast } from "sonner"
import { setRoomActive, deleteRoom } from "@/lib/supabase/actions/scheduler-rooms"
import { BlockedTimesSheet } from "@/components/scheduler/blocked-times-sheet"
import type { BlockedTime } from "@/lib/scheduler/blocked-times"
import type { SchedulerRoom } from "@/lib/supabase/queries/scheduler-rooms"

/**
 * The less common room actions under "⋯": blocked times, deactivate or
 * reactivate, and delete. Delete stays in the menu when the room has bookings,
 * greyed out with the reason underneath.
 */
export function RoomMoreMenu({ room, blocks }: { room: SchedulerRoom; blocks: BlockedTime[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [blockedOpen, setBlockedOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const inUse = room.booking_count > 0

  const toggleActive = () => {
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

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteRoom(room.id)
      if (result.success) {
        toast.success("Room deleted")
        setDeleteOpen(false)
        router.refresh()
      } else {
        toast.error(result.error ?? "Failed to delete room")
      }
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label={`More actions for ${room.display_name}`} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem onSelect={() => setBlockedOpen(true)}>
            <CalendarOff className="h-4 w-4" /> Blocked times
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={toggleActive}>
            {room.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
            {room.is_active ? "Deactivate (stop offering it)" : "Reactivate"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={inUse} onSelect={() => setDeleteOpen(true)} className="text-destructive focus:text-destructive">
            <Trash2 className="h-4 w-4" />
            <span>
              Delete room
              {inUse && (
                <span className="block text-xs text-muted-foreground">
                  Has {room.booking_count} booking{room.booking_count === 1 ? "" : "s"}, so deactivate it instead
                </span>
              )}
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <BlockedTimesSheet
        open={blockedOpen}
        onOpenChange={setBlockedOpen}
        subject={{ kind: "room", roomId: room.id }}
        subjectLabel={room.display_name}
        blocks={blocks}
        returnTo="/scheduler/rooms"
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
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
    </>
  )
}
