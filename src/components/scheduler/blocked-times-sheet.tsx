'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarOff, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { describeBlockedTime, hasEnded, type BlockClash, type BlockedTime } from '@/lib/scheduler/blocked-times'
import { todayInBusinessTz } from '@/lib/scheduler/search-params'
import { cn } from '@/lib/utils'
import { deleteBlockedTime, type BlockedTimeSubject } from '@/lib/supabase/actions/scheduler-blocked-times'
import { BlockedTimeClashList } from './blocked-time-clash-list'
import { BlockedTimeForm } from './blocked-time-form'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Whose blocks these are: the signed-in user, or one room. */
  subject: BlockedTimeSubject
  /** Room name for the heading when the subject is a room. */
  subjectLabel?: string
  blocks: BlockedTime[]
  /** Page the booking links in the overlap warning should lead back to. */
  returnTo?: string
}

type Mode = { kind: 'list' } | { kind: 'form'; block?: BlockedTime }

const COPY = {
  profile: {
    title: 'Blocked times',
    description: 'Repeating time when you are busy, like lunch. Colleagues are warned when they book you then.',
    empty: 'Nothing blocked yet. Block your lunch hour or a regular slot so colleagues can see you are busy.',
  },
  room: {
    title: 'Blocked times',
    description: 'Nobody can book this room during these times, and it is left out of room suggestions.',
    empty: 'Nothing blocked yet. Block the room for a regular class or maintenance.',
  },
}

/** Side panel listing the recurring blocks of one person or room, with add, edit and delete. */
export function BlockedTimesSheet({ open, onOpenChange, subject, subjectLabel, blocks, returnTo = '/scheduler' }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>({ kind: 'list' })
  const [clashes, setClashes] = useState<BlockClash[]>([])
  const [deleting, setDeleting] = useState<BlockedTime | null>(null)
  const [deletePending, setDeletePending] = useState(false)
  const copy = COPY[subject.kind]
  const today = todayInBusinessTz()
  // Blocks still in force first; ended ones stay listed so they can be extended or removed.
  const sortedBlocks = [...blocks].sort((a, b) => Number(hasEnded(a, today)) - Number(hasEnded(b, today)))

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setMode({ kind: 'list' })
      setClashes([])
    }
    onOpenChange(next)
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setDeletePending(true)
    const result = await deleteBlockedTime(deleting.id, subject)
    setDeletePending(false)
    if (!result.success) return toast.error(result.error ?? 'Could not delete the blocked time')
    toast.success('Blocked time removed')
    setDeleting(null)
    setClashes([])
    router.refresh()
  }

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {subject.kind === 'room' ? subjectLabel ?? 'Room' : 'My calendar'}
            </p>
            <SheetTitle>{copy.title}</SheetTitle>
            <SheetDescription>{copy.description}</SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4 pb-6">
            {mode.kind === 'form' ? (
              <BlockedTimeForm
                subject={subject}
                block={mode.block}
                onCancel={() => setMode({ kind: 'list' })}
                onSaved={saved => {
                  setClashes(saved.clashes)
                  setMode({ kind: 'list' })
                  router.refresh()
                }}
              />
            ) : (
              <>
                <BlockedTimeClashList clashes={clashes} returnTo={returnTo} />
                {blocks.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center">
                    <CalendarOff className="h-5 w-5 text-muted-foreground" aria-hidden />
                    <p className="text-sm text-muted-foreground">{copy.empty}</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {sortedBlocks.map(block => (
                      <li key={block.id} className="flex items-center gap-2 px-3 py-2.5">
                        <div className={cn('min-w-0 flex-1', hasEnded(block, today) && 'text-muted-foreground')}>
                          <p className="truncate text-sm font-medium">
                            {block.label}
                            {hasEnded(block, today) && <span className="ml-2 text-[11px] font-semibold uppercase tracking-wide">Ended</span>}
                          </p>
                          <p className="text-xs text-muted-foreground tabular-nums">{describeBlockedTime(block)}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" aria-label={`Edit ${block.label}`} onClick={() => { setClashes([]); setMode({ kind: 'form', block }) }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" aria-label={`Delete ${block.label}`} onClick={() => setDeleting(block)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <Button className="h-9" onClick={() => { setClashes([]); setMode({ kind: 'form' }) }}>
                  <Plus className="mr-1 h-4 w-4" /> Block time
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleting !== null} onOpenChange={next => !next && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove blocked time</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong className="text-foreground">{deleting?.label}</strong>? Its time becomes free again straight away.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deletePending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletePending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
