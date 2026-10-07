'use client'

import { useWatch } from 'react-hook-form'
import { AlertTriangle } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { formatHkTime } from '@/lib/scheduler/time-utils'
import type { ConflictSummary } from '@/lib/scheduler/conflicts'
import type { BookingForm } from './booking-dialog'

/** Lists people already busy for the requested slot; "Book anyway" bypasses the soft check on save. */
export function BookingConflictBanner({ conflicts, form }: { conflicts: ConflictSummary | null; form: BookingForm }) {
  const override = useWatch({ control: form.control, name: 'override_person_conflicts' }) ?? false

  if (!conflicts || conflicts.people.length === 0) return null

  return (
    <div role="alert" className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/40">
      <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        Some people are already busy at this time
      </div>
      <ul className="space-y-1 text-amber-800 dark:text-amber-300">
        {conflicts.people.map((interval, index) => (
          <li key={index} className="flex gap-2">
            <span className="shrink-0 tabular-nums">{formatHkTime(interval.startAt)}–{formatHkTime(interval.endAt)}</span>
            <span className="min-w-0 truncate">{interval.title}</span>
          </li>
        ))}
      </ul>
      <div className="flex min-h-9 flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-card px-3 py-1 dark:border-amber-800">
        <Checkbox
          id="override-person-conflicts"
          checked={override}
          onCheckedChange={v => form.setValue('override_person_conflicts', Boolean(v))}
        />
        <Label htmlFor="override-person-conflicts" className="cursor-pointer font-semibold">Book anyway</Label>
        <span className="text-xs text-muted-foreground">Save will double-book the people above.</span>
      </div>
    </div>
  )
}
