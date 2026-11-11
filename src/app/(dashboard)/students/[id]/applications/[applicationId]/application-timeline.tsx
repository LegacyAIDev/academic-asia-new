import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/applications/application-display"
import { STATUS_HISTORY_START, type TimelineEntry } from "@/lib/applications/application-timeline"
import type { ActivityEntry } from "@/lib/activity/activity-format"
import { ActivityHistory } from "@/components/features/activity-history"
import { NoneYet, Section } from "./application-section"

/**
 * Dated history of the application, newest first, as the same dot-and-line
 * timeline as a booking's history. The newest entry carries the accent; status
 * changes keep a filled dot so the journey's moves stand out among the dates.
 */
export function ApplicationTimeline({ entries, activity, activityLimit }: { entries: TimelineEntry[]; activity: ActivityEntry[] | null; activityLimit?: number }) {
  return (
    <Section title="History" plain>
      {entries.length === 0 ? (
        <NoneYet>No dated events recorded for this application.</NoneYet>
      ) : (
        <ol className="relative ml-1 space-y-4 border-l pl-4 text-sm">
          {entries.map((entry, index) => (
            <li key={`${entry.kind}-${entry.date}-${index}`} className="relative">
              <span aria-hidden className={cn(
                "absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card",
                index === 0 ? "bg-primary" : entry.kind === "status" ? "bg-foreground/70" : "bg-muted-foreground/40",
              )} />
              <p className="font-medium leading-tight">{entry.title}</p>
              <p className="text-xs text-muted-foreground">
                <span className="tabular-nums">{formatDate(entry.date)}{entry.time ? ` · ${entry.time}` : ""}</span>
                {entry.detail && <> · {entry.detail}</>}
              </p>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        Status changes are recorded from {formatDate(STATUS_HISTORY_START)}; earlier ones were not kept.
      </p>
      {/* Every edit and who made it, folded under the dated milestones above. */}
      <details className="group mt-4 border-t pt-3">
        <summary className="cursor-pointer list-none text-sm font-medium text-brand-navy hover:underline [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">Show every change{activity?.length ? ` (${activity.length})` : ""}</span>
          <span className="hidden group-open:inline">Hide every change</span>
        </summary>
        <div className="mt-3">
          <ActivityHistory entries={activity} limit={activityLimit} bare />
        </div>
      </details>
    </Section>
  )
}
