import Link from "next/link"
import { formatDistanceToNowStrict } from "date-fns"
import { describeGroup } from "@/lib/dashboard/group-activity"
import type { RecentActivity } from "@/lib/supabase/queries/dashboard"
import { DashboardPanel } from "./dashboard-panel"

/** The latest changes the team made, in plain words, each opening its record; who made it shows unless it was an import. */
export function RecentActivityPanel({ entries }: { entries: RecentActivity[] | null }) {
  return (
    <DashboardPanel title="Recent changes" flush>
      {entries === null ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">Recent changes could not be loaded.</p>
      ) : entries.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">Changes to students, schools and bookings appear here as the team works.</p>
      ) : (
        <ul className="divide-y">
          {entries.map(entry => {
            const what = describeGroup(entry)
            const body = (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{entry.subject ?? entry.label ?? what}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {entry.subject || entry.label ? what : null}
                    {entry.label && entry.subject && entry.label !== entry.subject ? ` (${entry.label})` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-right text-xs text-muted-foreground">
                  <time dateTime={entry.occurredAt} className="block">{formatDistanceToNowStrict(new Date(entry.occurredAt), { addSuffix: true })}</time>
                  {entry.actorName !== "System" && <span className="block">{entry.actorName}</span>}
                </span>
              </>
            )
            return (
              <li key={entry.id}>
                {entry.href ? (
                  <Link href={entry.href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60">{body}</Link>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-2.5">{body}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </DashboardPanel>
  )
}
