"use client"

import { useState, useTransition } from "react"
import { KeyRound, Loader2, MoreHorizontal, Power, PowerOff, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useRouterWithProgress } from "@/components/layout/navigation-progress"
import { deleteStaff, setStaffActive, setStaffPassword } from "@/lib/supabase/actions/staff"
import { EditStaffButton } from "../staff-form-sheet"

/** Edit details (a drawer) and More: reset password, deactivate or reactivate, delete. */
export function StaffHeaderActions({ staffId, name, active, isSelf }: {
  staffId: string
  name: string
  /** False when they can no longer sign in. */
  active: boolean
  /** The signed-in user's own page: they cannot deactivate or delete themselves. */
  isSelf: boolean
}) {
  const router = useRouterWithProgress()
  const [isPending, startTransition] = useTransition()
  const [dialog, setDialog] = useState<"password" | "active" | "delete" | null>(null)
  const [password, setPassword] = useState("")
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const close = () => {
    setDialog(null)
    setPassword("")
    setPasswordError(null)
  }

  const savePassword = () => {
    if (password.length < 6) return setPasswordError("Use at least 6 characters.")
    startTransition(async () => {
      const result = await setStaffPassword(staffId, password)
      if (!result.success) return setPasswordError(result.error ?? "Could not set the password")
      toast.success(`New password set for ${name}`)
      close()
    })
  }

  const toggleActive = () => {
    startTransition(async () => {
      const result = await setStaffActive(staffId, !active)
      if (!result.success) return void toast.error(result.error ?? "Could not update")
      toast.success(active ? `${name} can no longer sign in` : `${name} can sign in again`)
      close()
      router.refresh()
    })
  }

  const remove = () => {
    startTransition(async () => {
      const result = await deleteStaff(staffId)
      if (!result.success) return void toast.error(result.error ?? "Could not delete")
      toast.success(`${name} deleted`)
      close()
      router.push("/staff")
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <EditStaffButton staffId={staffId} name={name} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="More actions"><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={() => setDialog("password")}><KeyRound className="h-4 w-4" /> Reset password</DropdownMenuItem>
          {!isSelf && (
            <>
              <DropdownMenuItem onSelect={() => setDialog("active")}>
                {active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                {active ? "Deactivate" : "Reactivate"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setDialog("delete")} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4" /> Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialog === "password"} onOpenChange={open => !open && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>Set a new password for {name}, then tell them what it is.</DialogDescription>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); savePassword() }} className="space-y-2">
            <Label htmlFor="staff-new-password">New password</Label>
            <Input id="staff-new-password" type="password" autoComplete="new-password" value={password}
              onChange={e => { setPassword(e.target.value); setPasswordError(null) }} placeholder="At least 6 characters" autoFocus />
            {passwordError && <p role="alert" className="text-sm text-destructive">{passwordError}</p>}
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={close} disabled={isPending}>Cancel</Button>
              <Button type="submit" disabled={isPending} className="gap-2">
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />} Set password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={dialog === "active"} onOpenChange={open => !open && close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{active ? `Deactivate ${name}?` : `Reactivate ${name}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {active
                ? "They will no longer be able to sign in. Their records and history stay, and you can reactivate them at any time."
                : "They will be able to sign in again with their current password."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={e => { e.preventDefault(); toggleActive() }} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : active ? "Deactivate" : "Reactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={dialog === "delete"} onOpenChange={open => !open && close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes their sign-in and profile for good. To keep their history, deactivate them instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={e => { e.preventDefault(); remove() }} disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
