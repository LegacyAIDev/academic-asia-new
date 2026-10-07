'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TIMEZONE_LABEL } from '@/lib/scheduler/config'
import { formatHkDate, formatHkTime } from '@/lib/scheduler/time-utils'
import type { EventMove } from '@/components/scheduler/scheduler-calendar'

type Props = {
  move: EventMove | null
  onCancel: () => void
  onConfirm: (reason: string) => Promise<void>
}

/** Asks for a reason before a dragged or resized booking is saved (spec CAL-06, CAL-11). */
export function MoveConfirmDialog({ move, onCancel, onConfirm }: Props) {
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()

  const submit = () => {
    if (reason.trim().length < 3) return
    startTransition(async () => {
      await onConfirm(reason.trim())
      setReason('')
    })
  }

  return (
    <Dialog open={move !== null} onOpenChange={open => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule booking</DialogTitle>
          {move && (
            <DialogDescription>
              New time: {formatHkDate(move.start)} {formatHkTime(move.start)} – {formatHkTime(move.end)} {TIMEZONE_LABEL}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="move-reason">Reason</Label>
          <Textarea id="move-reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is this booking moving?" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isPending}>Keep original</Button>
          <Button onClick={submit} disabled={isPending || reason.trim().length < 3}>Move booking</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
