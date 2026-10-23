'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/** YYYY-MM-DD as a local calendar date, without the time zone shift `new Date('2026-11-03')` would add. */
function parseDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

type Props = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  ariaLabel: string
}

/** Date button that opens a month picker and reports the choice as YYYY-MM-DD. */
export function BlockedTimeDateField({ value, onChange, disabled, ariaLabel }: Props) {
  const [open, setOpen] = useState(false)
  const date = parseDate(value)
  const pick = (next: Date | undefined) => {
    if (!next) return
    onChange(format(next, 'yyyy-MM-dd'))
    setOpen(false)
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="h-9 w-full justify-start font-normal tabular-nums" disabled={disabled} aria-label={ariaLabel}>
          <CalendarIcon className="mr-2 h-4 w-4" aria-hidden />
          {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" weekStartsOn={1} selected={date} defaultMonth={date} onSelect={pick} />
      </PopoverContent>
    </Popover>
  )
}
