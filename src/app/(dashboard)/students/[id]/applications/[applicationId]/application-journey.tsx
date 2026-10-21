import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { JOURNEY_STAGES, journeyFor, stageLabel } from "@/lib/applications/application-journey"
import { formatHkDay } from "@/lib/applications/application-display"
import { Eyebrow } from "./application-section"

type Props = {
  status: { code: string; label: string } | null
  /** When the application reached its current status, if that change was recorded. */
  since: string | null
}

/**
 * The application's route through the six steps of the customer's prototype:
 * one line, filled up to the current step. The step is derived from the status
 * (see application-journey.ts), so it moves as soon as staff change the status.
 * Narrow screens get a progress bar with the step name instead of the six stops.
 */
export function ApplicationJourney({ status, since }: Props) {
  const { stage, outcome } = journeyFor(status?.code)
  const current = stage ? JOURNEY_STAGES.indexOf(stage) : -1
  const closed = outcome === "closed"
  const lastIndex = JOURNEY_STAGES.length - 1
  const filled = current < 0 ? 0 : current / lastIndex
  const tone = closed ? "bg-destructive" : "bg-primary"

  return (
    <section aria-label="Application journey" className="rounded-xl border bg-card px-4 py-4 sm:px-6 sm:py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Eyebrow>Journey</Eyebrow>
        <p className="text-sm">
          {outcome === "placed" && <span className="font-medium text-primary">Placed</span>}
          {closed && <span className="font-medium text-destructive">Closed · {status?.label}</span>}
          {outcome === "open" && stage && <span>At <span className="font-medium">{stageLabel(stage)}</span></span>}
          {outcome === "open" && !stage && (
            <span className="text-muted-foreground">{status?.label ? `“${status.label}” has no step on the journey` : "No status yet"}</span>
          )}
          {since && <span className="tabular-nums text-muted-foreground"> · since {formatHkDay(since)}</span>}
        </p>
      </div>

      {/* Narrow screens: one bar and the step name. */}
      <div className="mt-3 sm:hidden" aria-hidden>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full", tone)} style={{ width: `${current < 0 ? 0 : ((current + 1) / JOURNEY_STAGES.length) * 100}%` }} />
        </div>
        {stage && <p className="mt-1.5 text-xs text-muted-foreground">Step {current + 1} of {JOURNEY_STAGES.length}</p>}
      </div>

      {/* Wider screens: the six stops on one line. */}
      <ol className="relative mt-5 hidden grid-cols-6 sm:grid">
        <span aria-hidden className="absolute top-[7px] h-0.5 rounded-full bg-border" style={{ left: "calc(100% / 12)", right: "calc(100% / 12)" }} />
        <span aria-hidden className={cn("absolute top-[7px] h-0.5 rounded-full transition-[width] motion-reduce:transition-none", tone)}
          style={{ left: "calc(100% / 12)", width: `calc((100% - 100% / 6) * ${filled})` }} />
        {JOURNEY_STAGES.map((step, index) => {
          const done = index < current
          const isCurrent = index === current
          return (
            <li key={step} aria-current={isCurrent ? "step" : undefined} className="relative flex flex-col items-center px-1 text-center">
              <span className={cn(
                "relative z-10 flex h-4 w-4 items-center justify-center rounded-full border-2",
                done && cn("border-transparent text-primary-foreground", tone),
                isCurrent && cn("border-transparent ring-4", tone, closed ? "ring-destructive/15" : "ring-primary/15"),
                !done && !isCurrent && "border-border bg-card",
              )}>
                {done && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
              </span>
              <span className={cn(
                "mt-2 text-xs leading-tight",
                isCurrent ? "font-semibold text-foreground" : done ? "text-foreground" : "text-muted-foreground",
              )}>
                {stageLabel(step)}
              </span>
              {done && <span className="sr-only">(completed)</span>}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
