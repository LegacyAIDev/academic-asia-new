"use client"

import { useState } from "react"
import { CalendarDays, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { parseDateOnly, toDateOnly } from "@/lib/date-only"
import { cn } from "@/lib/utils"

/**
 * A date picked from a calendar, shown as "7 Feb 2011" (never the browser's
 * own mm/dd/yyyy box) and sent with the form as YYYY-MM-DD under `name`.
 * Optional dates can be cleared.
 */
export function DateField({ name, id, defaultValue, value, placeholder = "Pick a date", required, className, fromYear, toYear, onChange }: {
  name: string
  id?: string
  defaultValue?: string | null
  /** Controlled value (YYYY-MM-DD or null); pair with onChange. */
  value?: string | null
  placeholder?: string
  required?: boolean
  className?: string
  /** Year range of the month/year dropdowns (e.g. birth dates go back further). */
  fromYear?: number
  toYear?: number
  onChange?: (value: string | null) => void
}) {
  const [ownDate, setOwnDate] = useState<Date | undefined>(parseDateOnly(defaultValue?.slice(0, 10) ?? null))
  const date = value !== undefined ? parseDateOnly(value?.slice(0, 10) ?? null) : ownDate
  const setDate = (next: Date | undefined) => { if (value === undefined) setOwnDate(next) }
  const [open, setOpen] = useState(false)
  const set = (next: Date | undefined) => {
    setDate(next)
    onChange?.(next ? toDateOnly(next) : null)
  }
  const thisYear = new Date().getFullYear()

  return (
    <div className={cn("relative", className)}>
      <input type="hidden" name={name} value={date ? toDateOnly(date) : ""} required={required} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button id={id} type="button" variant="outline" className="w-full justify-start pr-9 font-normal tabular-nums">
            <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            {date
              ? date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
              : <span className="text-muted-foreground">{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            weekStartsOn={1}
            selected={date}
            defaultMonth={date}
            captionLayout="dropdown"
            fromYear={fromYear ?? thisYear - 30}
            toYear={toYear ?? thisYear + 5}
            onSelect={next => { set(next); setOpen(false) }}
          />
        </PopoverContent>
      </Popover>
      {date && !required && (
        <button
          type="button"
          onClick={() => set(undefined)}
          aria-label="Clear date"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
