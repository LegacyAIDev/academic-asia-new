"use client"

import { useState } from "react"
import { Loader2, Search } from "lucide-react"
import { useDebouncedCallback } from "use-debounce"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ExamDeskOption, ExamDeskOptions } from "@/lib/exams/exam-desk-filter-sort"
import type { ExamDeskParams } from "@/lib/exams/exam-page-search-params"
import { ExamDateRangeFilter } from "./exam-date-range-filter"
import { useExamsUrl } from "./use-exams-url"

/** Stands for "no selection": a Radix Select cannot hold an empty string value. */
const ANY = "__any__"

type Props = {
  params: ExamDeskParams
  options: ExamDeskOptions
  /** True when anything differs from the bare desk, so there is something to clear. */
  canClear: boolean
}

/** Filter bar of the exam desk. Every choice is written to the URL, the list itself is rendered on the server. */
export function ExamDeskFilters({ params, options, canClear }: Props) {
  const { update, reset, isPending } = useExamsUrl()
  const [search, setSearch] = useState(params.q)
  const [pushedQ, setPushedQ] = useState(params.q)
  const [seenQ, setSeenQ] = useState(params.q)

  // The search text in the URL changed without this box asking for it (browser
  // Back, a shared link): show what the list is actually filtered by.
  if (params.q !== seenQ) {
    setSeenQ(params.q)
    if (params.q !== pushedQ) {
      setSearch(params.q)
      setPushedQ(params.q)
    }
  }

  const pushSearch = useDebouncedCallback((value: string) => {
    const q = value.trim()
    setPushedQ(q)
    update({ q: q || null })
  }, 300)

  const clearAll = () => {
    pushSearch.cancel()
    setSearch("")
    setPushedQ("")
    reset()
  }

  const selectFilter = (key: string, value: string | null, allLabel: string, list: ExamDeskOption[]) => (
    <Select value={value ?? ANY} onValueChange={v => update({ [key]: v === ANY ? null : v })}>
      <SelectTrigger className="h-9 w-[180px]" aria-label={allLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        <SelectItem value={ANY}>{allLabel}</SelectItem>
        {list.map(option => (
          <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const entryYears = options.entryYears.map(year => ({ id: String(year), label: `${year} entry` }))

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              Filter examination bookings
              {isPending && <Loader2 role="status" aria-label="Updating the list" className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </h2>
            <p className="text-xs text-muted-foreground">Narrow the list here; sort it from any column heading.</p>
          </div>
          {canClear && (
            <Button variant="outline" size="sm" onClick={clearAll}>Clear filters</Button>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <ExamDateRangeFilter key={`${params.from}|${params.to}`} from={params.from} to={params.to} onUpdate={update} />
          {selectFilter("room", params.roomId, "All rooms", options.rooms)}
          {selectFilter("school", params.schoolId, "All schools", options.schools)}
          {selectFilter("year", params.entryYear === null ? null : String(params.entryYear), "All entry years", entryYears)}
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search examinations"
              maxLength={100}
              placeholder="Student, school, assessment…"
              className="h-9 pl-9"
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                pushSearch(e.target.value)
              }}
            />
          </div>
        </div>

        {params.rangeClamped && (
          <p className="text-xs text-muted-foreground">The desk shows at most 62 days at a time, so the range was shortened.</p>
        )}
      </CardContent>
    </Card>
  )
}
