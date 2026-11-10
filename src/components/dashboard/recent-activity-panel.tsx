import Link from "next/link"
import { formatDistanceToNowStrict } from "date-fns"
import { describeGroup } from "@/lib/dashboard/group-activity"
import type { RecentActivity } from "@/lib/supabase/queries/dashboard"
import { DashboardPanel } from "./dashboard-panel"

/** The latest changes the team made, in plain words, each opening its record. */
export function RecentActivityPanel({ entries }: { entries: RecentActivity[] | null }) {
  return (
    <DashboardPanel title="Recent activity" className="lg:col-span-2">
      {entries === null ? (
        <p className="text-sm text-muted-foreground">Recent activity could not be loaded.</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Changes to students, schools and bookings will show here as the team works.</p>
      ) : (
        <ul className="-mx-2 divide-y">
          {entries.map(entry => {
            const body = (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{entry.subject ?? entry.label ?? describeGroup(entry)}</span>
                  <span className="block text-sm text-muted-foreground sm:truncate">
                    {entry.subject ?? entry.label
                      ? `${describeGroup(entry)}${entry.label && entry.subject && entry.label !== entry.subject ? ` (${entry.label})` : ""}, by ${entry.actorName}`
                      : `By ${entry.actorName}`}
                  </span>
                </span>
                <time dateTime={entry.occurredAt} className="shrink-0 text-xs text-muted-foreground">
                  {formatDistanceToNowStrict(new Date(entry.occurredAt), { addSuffix: true })}
                </time>
              </>
            )
            return (
              <li key={entry.id}>
                {entry.href ? (
                  <Link href={entry.href} className="flex items-center gap-4 rounded-lg px-2 py-3 hover:bg-muted/60">{body}</Link>
                ) : (
                  <div className="flex items-center gap-4 px-2 py-3">{body}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </DashboardPanel>
  )
}
