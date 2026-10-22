"use client"

import { useMemo, useState } from "react"
import { Copy } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { resultsSummaryText, summariseResultsByYear, type ResultsYearRange } from "@/lib/schools/academic-results-summary"
import type { SchoolAcademicResultWithJoins } from "@/lib/supabase/queries/school-academic-results"

const RANGES: { value: ResultsYearRange; label: string }[] = [
  { value: "latest3", label: "Latest 3 years" },
  { value: "last5", label: "Last 5 years" },
  { value: "all", label: "All years" },
]

/**
 * Exam results the way Jack's prototype shows them: one block per year, newest
 * first, with a GCSE line and an A Level line (then any other exam type the
 * school published that year) and the grade bands as figures from narrowest to
 * widest. "All records" next to it lists the stored records one by one.
 */
export function AcademicResultsSummary({ results }: { results: SchoolAcademicResultWithJoins[] }) {
  const [range, setRange] = useState<ResultsYearRange>("latest3")
  const years = useMemo(() => summariseResultsByYear(results, range), [results, range])
  // Records the year blocks cannot show; they stay under All records, and staff are told so.
  const notSummarised = results.filter(r => r.exam_year == null || r.result_percentage == null).length

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(resultsSummaryText(years))
      toast.success("Results summary copied")
    } catch {
      toast.error("Could not copy. Select the figures and copy them instead.")
    }
  }

  return (
    <div className="space-y-4 px-6 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Years shown" className="flex flex-wrap items-center gap-1">
          {RANGES.map(option => (
            <Button key={option.value} type="button" size="sm" className="h-9 px-3 text-xs"
              variant={option.value === range ? "secondary" : "ghost"}
              aria-pressed={option.value === range} onClick={() => setRange(option.value)}>
              {option.label}
            </Button>
          ))}
        </div>
        {years.length > 0 && (
          <Button type="button" variant="outline" size="sm" className="h-9 gap-2" onClick={copySummary}>
            <Copy className="h-3.5 w-3.5" /> Copy summary
          </Button>
        )}
      </div>

      {years.length === 0 ? (
        <p className="text-sm text-muted-foreground">No results with an exam year and a figure to summarise.</p>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {years.map(({ year, lines }) => (
            <section key={year} className="flex flex-col gap-3 p-4 sm:flex-row sm:gap-6">
              <h3 className="w-16 shrink-0 text-2xl font-semibold tracking-tight tabular-nums">{year}</h3>
              <div className="min-w-0 flex-1 space-y-3">
                {lines.map(line => (
                  <div key={line.code} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                    <p className="min-w-24 shrink-0 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {line.examType}
                    </p>
                    <dl aria-label={`${line.examType} ${year}`} className="flex flex-wrap gap-2">
                      {line.figures.map(figure => (
                        <div key={figure.band} className="min-w-[5rem] rounded-md border border-border bg-muted/30 px-2.5 py-1.5">
                          <dt className="whitespace-nowrap text-[11px] text-muted-foreground">{figure.band}</dt>
                          <dd className="text-sm font-semibold tabular-nums">{figure.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Source:</span> school-published examination results. Check them against the
        school&apos;s latest publication before sharing them outside Academic Asia.
      </p>
      {notSummarised > 0 && (
        <p className="text-xs text-muted-foreground">
          <span className="tabular-nums">{notSummarised}</span> record{notSummarised === 1 ? " has" : "s have"} no exam year or no figure
          and {notSummarised === 1 ? "is" : "are"} listed under All records only.
        </p>
      )}
    </div>
  )
}
