"use client"

import { useId, useState } from "react"
import { DateField } from "@/components/ui/date-field"
import { Label } from "@/components/ui/label"
import { isDeskDate } from "@/lib/exams/exam-page-search-params"
import { useExamsUrl, type ExamsUrlUpdate } from "./use-exams-url"

type Props = {
  /** YYYY-MM-DD, or an empty string when no date is chosen. */
  from: string
  to: string
  /** The filter bar passes its own URL writer so quick changes to dates and filters build on each other. */
  onUpdate?: ExamsUrlUpdate
}

/**
 * From / To dates for the exams page, picked from the app's calendar (shown as
 * "11 Nov 2026"); clearing one removes it from the address. Callers pass a `key`
 * made of both dates, which resets the drafts whenever the range changes
 * elsewhere (for example through "Clear filters").
 */
export function ExamDateRangeFilter({ from, to, onUpdate }: Props) {
  const id = useId()
  const own = useExamsUrl()
  const update = onUpdate ?? own.update
  const [fromDraft, setFromDraft] = useState(from)
  const [toDraft, setToDraft] = useState(to)

  const changeFrom = (value: string) => {
    setFromDraft(value)
    if (!isDeskDate(value)) return
    // A start after the current end would be an empty range, so the end follows it.
    update(to && value > to ? { from: value, to: value } : { from: value })
  }

  const changeTo = (value: string) => {
    setToDraft(value)
    if (!isDeskDate(value)) return
    update(from && value < from ? { from: value, to: value } : { to: value })
  }

  return (
    <div className="flex items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor={`${id}-from`} className="text-xs text-muted-foreground">From</Label>
        <DateField
          id={`${id}-from`}
          name="from"
          className="w-[160px]"
          placeholder="Any date"
          value={fromDraft || null}
          onChange={value => (value ? changeFrom(value) : (setFromDraft(""), from && update({ from: null })))}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${id}-to`} className="text-xs text-muted-foreground">To</Label>
        <DateField
          id={`${id}-to`}
          name="to"
          className="w-[160px]"
          placeholder="Any date"
          value={toDraft || null}
          onChange={value => (value ? changeTo(value) : (setToDraft(""), to && update({ to: null })))}
        />
      </div>
    </div>
  )
}
