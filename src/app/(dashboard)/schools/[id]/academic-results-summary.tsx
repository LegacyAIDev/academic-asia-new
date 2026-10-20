"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { summariseAcademicResults, type ResultsYearRange } from "@/lib/schools/academic-results-summary"
import type { SchoolAcademicResultWithJoins } from "@/lib/supabase/queries/school-academic-results"

const RANGES: { value: ResultsYearRange; label: string }[] = [
  { value: "latest3", label: "Latest 3 years" },
  { value: "last5", label: "Last 5 years" },
  { value: "all", label: "All years" },
]

/**
 * Exam results as the customer's prototype shows them: one table per exam type
 * with a line per year and the grade bands as columns. The figures are the
 * stored records; "All records" next to it lists them one by one.
 */
export function AcademicResultsSummary({ results }: { results: SchoolAcademicResultWithJoins[] }) {
  const [range, setRange] = useState<ResultsYearRange>("latest3")
  const blocks = useMemo(() => summariseAcademicResults(results, range), [results, range])
  const withoutYear = results.filter(r => r.exam_year == null).length

  return (
    <div className="space-y-5 px-6 pb-6">
      <div role="group" aria-label="Years shown" className="flex flex-wrap items-center gap-1">
        {RANGES.map(option => (
          <Button key={option.value} type="button" size="sm" className="h-7 px-2.5 text-xs"
            variant={option.value === range ? "secondary" : "ghost"}
            aria-pressed={option.value === range} onClick={() => setRange(option.value)}>
            {option.label}
          </Button>
        ))}
      </div>

      {blocks.length === 0 && <p className="text-sm text-muted-foreground">No results with an exam year to summarise.</p>}

      {blocks.map(block => (
        <section key={block.code} aria-label={`${block.examType} results`}>
          <h3 className="mb-2 text-sm font-semibold">{block.examType}</h3>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-20">Year</TableHead>
                  {block.bands.map(band => (
                    <TableHead key={band} className="whitespace-nowrap text-right">{band}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {block.rows.map(row => (
                  <TableRow key={row.year}>
                    <TableHead scope="row" className="font-medium text-foreground tabular-nums">{row.year}</TableHead>
                    {row.values.map((value, index) => (
                      <TableCell key={block.bands[index]} className="text-right tabular-nums">
                        {value ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      ))}

      {withoutYear > 0 && (
        <p className="text-xs text-muted-foreground">
          {withoutYear} record{withoutYear === 1 ? " has" : "s have"} no exam year and {withoutYear === 1 ? "is" : "are"} listed under All records only.
        </p>
      )}
    </div>
  )
}
