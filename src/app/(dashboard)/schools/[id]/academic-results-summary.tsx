"use client"

import { useMemo, useState } from "react"
import { Copy } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  resultsSummaryText, summariseResultsByYear, type ResultsFigure, type ResultsYearRange,
} from "@/lib/schools/academic-results-summary"
import type { SchoolAcademicResultWithJoins } from "@/lib/supabase/queries/school-academic-results"

const RANGES: { value: ResultsYearRange; label: string }[] = [
  { value: "latest3", label: "Latest 3 years" },
  { value: "last5", label: "Last 5 years" },
  { value: "all", label: "All years" },
]

/**
 * One published figure: the band over the result, and a hairline bar filled to
 * the result. Bands are cumulative (A*–B includes every A* and A), so along a
 * line the bars climb into a staircase: the shape of the school's grades.
 */
function Figure({ figure }: { figure: ResultsFigure }) {
  const empty = figure.value === null
  return (
    <div className="min-w-0">
      {/* Word joiners keep "9–8" together on a phone, so it wraps as "Grades" over "9–8", never "Grades 9–" over "8". */}
      <dt className="text-[11px] leading-tight text-muted-foreground">
        {figure.band.replace("–", "\u2060–\u2060")}
      </dt>
      <dd className={cn("mt-0.5 tabular-nums", empty ? "text-sm text-muted-foreground" : "text-base font-semibold")}>
        {empty ? <><span aria-hidden>—</span><span className="sr-only">not published</span></> : figure.value}
      </dd>
      {/* No track under a gap, so a missing band reads as missing rather than as 0%. */}
      {figure.share !== null && (
        <div aria-hidden className="mt-1.5 h-[3px] rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${figure.share * 100}%` }} />
        </div>
      )}
    </div>
  )
}

/**
 * Exam results the way Jack's prototype shows them: one block per year, newest
 * first, with a GCSE line, an A Level line and any other exam type the school
 * published that year. Each exam type keeps the same columns in every year on
 * screen, so a band can be read straight down from year to year.
 */
export function AcademicResultsSummary({ results }: { results: SchoolAcademicResultWithJoins[] }) {
  const [range, setRange] = useState<ResultsYearRange>("latest3")
  const years = useMemo(() => summariseResultsByYear(results, range), [results, range])
  // Records the year blocks cannot show; they stay under All records, and staff are told so.
  const notSummarised = results.filter(r => r.exam_year == null || r.result_percentage == null).length
  // The cumulative note only helps where ranges like "A*–B" are shown.
  const showsRanges = years.some(y => y.lines.some(l => l.figures.some(f => f.band.includes("–"))))

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
        <>
          {showsRanges && <p className="text-xs text-muted-foreground">Bands are cumulative: A*–B counts every A*, A and B grade.</p>}
          <div className="divide-y divide-border border-y border-border">
            {years.map(({ year, lines }) => (
              <section key={year} className="flex flex-col gap-3 py-5 sm:flex-row sm:gap-8">
                <h3 className="w-20 shrink-0 text-3xl font-semibold leading-none tracking-tight tabular-nums">{year}</h3>
                <div className="min-w-0 flex-1 space-y-5">
                  {lines.map(line => (
                    <div key={line.code} className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                      <p className="w-20 shrink-0 pt-px text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {line.examType}
                      </p>
                      {/* Capped columns keep a two-band line compact; a long IB line scrolls inside itself on a phone. */}
                      <div
                        role="group"
                        aria-label={`${line.examType} ${year}`}
                        tabIndex={0}
                        className="min-w-0 flex-1 overflow-x-auto rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <dl
                          className="grid gap-x-3 gap-y-3 sm:gap-x-4"
                          style={{ gridTemplateColumns: `repeat(${line.figures.length}, minmax(3.25rem, 7rem))` }}
                        >
                          {line.figures.map(figure => <Figure key={figure.band} figure={figure} />)}
                        </dl>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
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
