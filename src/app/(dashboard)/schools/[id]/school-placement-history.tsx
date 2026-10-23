"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  figuresForYear,
  placementYearOptions,
  toPlacementRows,
  type PlacementYearCounts,
} from "@/lib/schools/placement-history"
import { PlacementHistoryTable } from "./placement-history-table"
import { PlacementKpiTiles } from "./placement-kpi-tiles"

/**
 * How many of our students applied to this school, got an offer, accepted it and
 * were placed. Pick an academic year for its five figures; the table below keeps
 * every year and the all-years total in view. The default year comes from the
 * server so the first render matches on the client.
 */
export function SchoolPlacementHistory({ counts, defaultYear }: { counts: PlacementYearCounts[] | null; defaultYear: string }) {
  const [year, setYear] = useState(defaultYear)
  const { rows, total } = toPlacementRows(counts ?? [])
  const options = placementYearOptions(counts ?? [])
  const figures = figuresForYear(counts ?? [], year)

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-medium">Placement history</CardTitle>
        <p className="text-xs text-muted-foreground">
          By current application status; enquiries are not counted. Accepted means the family paid a deposit. Placed
          means still placed and the entry date has arrived. Rate = accepted ÷ applications.
        </p>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {counts === null ? (
          <p role="alert" className="px-6 pb-6 text-sm text-destructive">Placement history is unavailable right now. Reload the page to try again.</p>
        ) : total === null ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">No applications to this school yet.</p>
        ) : (
          <div className="space-y-6 pb-2">
            <div className="space-y-4 px-6">
              <div className="space-y-1.5">
                <Label htmlFor="placement-year" className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Academic year
                </Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger id="placement-year" className="h-9 w-full sm:w-56">
                    <SelectValue>{options.find(option => option.key === year)?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {options.map(option => <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <PlacementKpiTiles figures={figures} />
            </div>
            <PlacementHistoryTable rows={rows} total={total} selectedLabel={figures.label} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
