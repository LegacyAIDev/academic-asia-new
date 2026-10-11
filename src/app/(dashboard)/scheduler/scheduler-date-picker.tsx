'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { CalendarDays } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { TIMEZONE_LABEL } from '@/lib/scheduler/config'

type Props = {
  /** YYYY-MM-DD in the business timezone. */
  date: string
  label: string
  pending: boolean
  onSelect: (date: string) => void
}

/** The date label in the command bar; clicking it opens a month calendar to jump to any day. */
export function SchedulerDatePicker({ date, label, pending, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const [y, m, d] = date.split('-').map(Number)
  // A plain local date is enough here: the picker only deals in calendar days.
  const selected = new Date(y, m - 1, d)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Choose date, ${label}`}
          className={cn(
            'flex min-w-[170px] items-center gap-2 rounded-md px-2 py-1 text-left leading-tight hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            pending && 'opacity-60',
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span aria-live="polite">
            <span className="block text-sm font-semibold tabular-nums">{label}</span>
            <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">{TIMEZONE_LABEL}</span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          required
          captionLayout="dropdown"
          startMonth={new Date(y - 3, 0)}
          endMonth={new Date(y + 3, 11)}
          selected={selected}
          defaultMonth={selected}
          weekStartsOn={1}
          onSelect={day => {
            if (!day) return
            onSelect(format(day, 'yyyy-MM-dd'))
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
