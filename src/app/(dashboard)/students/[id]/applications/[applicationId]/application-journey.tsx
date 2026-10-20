import { Check, CircleSlash, PartyPopper, Route } from "lucide-react"
import { cn } from "@/lib/utils"
import { JOURNEY_STAGES, journeyFor, stageLabel } from "@/lib/applications/application-journey"

type Props = { status: { code: string; label: string } | null }

/**
 * The six steps of the customer's prototype with the application's place on
 * them. The step is derived from the status (see application-journey.ts), so it
 * moves as soon as staff change the status.
 */
export function ApplicationJourney({ status }: Props) {
  const { stage, outcome } = journeyFor(status?.code)
  const current = stage ? JOURNEY_STAGES.indexOf(stage) : -1

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm" aria-label="Application journey">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
            <Route className="h-3.5 w-3.5 text-primary" />
          </div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Journey</h2>
        </div>
        {outcome === "placed" && (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            <PartyPopper className="h-3.5 w-3.5" /> Placed
          </span>
        )}
        {outcome === "closed" && (
          <span className="flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700">
            <CircleSlash className="h-3.5 w-3.5" /> Closed: {status?.label}
          </span>
        )}
      </div>

      <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {JOURNEY_STAGES.map((step, index) => {
          const done = index < current
          const isCurrent = index === current
          return (
            <li
              key={step}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                done && "border-primary/20 bg-primary/5 text-foreground",
                isCurrent && outcome !== "closed" && "border-primary bg-primary text-primary-foreground shadow-sm",
                isCurrent && outcome === "closed" && "border-rose-300 bg-rose-50 text-rose-700",
                !done && !isCurrent && "text-muted-foreground",
              )}
            >
              <span className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
                done && "border-primary bg-primary text-primary-foreground",
                isCurrent && "border-current",
              )}>
                {done ? <Check className="h-3 w-3" /> : index + 1}
              </span>
              <span className="leading-tight">{stageLabel(step)}</span>
              {done && <span className="sr-only">(completed)</span>}
            </li>
          )
        })}
      </ol>

      {current === -1 && outcome === "open" && (
        <p className="mt-3 text-xs text-muted-foreground">
          {status?.label ? `"${status.label}"` : "This status"} has no step on the journey.
        </p>
      )}
    </section>
  )
}
