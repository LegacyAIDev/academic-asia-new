"use client"

import { useState } from "react"
import { History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { describeActivity, type ActivityEntry } from "@/lib/activity/activity-format"
import { formatEmailDate } from "@/lib/emails/email-form"

const PAGE = 20

/**
 * Read-only history of what happened to a record and who did it (meeting note
 * 18, SEC-06). Kept apart from notes, which staff write themselves (STU-14).
 */
export function ActivityHistory({ entries, title = "Activity", limit }: { entries: ActivityEntry[] | null; title?: string; limit?: number }) {
  const [shown, setShown] = useState(PAGE)

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <History className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries === null ? (
          <p className="text-sm text-destructive" role="alert">The activity could not be loaded. Refresh the page to try again.</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <>
            <ol className="space-y-0" aria-label={title}>
              {entries.slice(0, shown).map(entry => (
                <li key={entry.id} className="border-t py-2.5 first:border-t-0">
                  <p className="text-sm">
                    {describeActivity(entry)}
                    {entry.label && <span className="text-muted-foreground"> · {entry.label}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.actorName} · <time dateTime={entry.occurredAt}>{formatEmailDate(entry.occurredAt)}</time>
                  </p>
                </li>
              ))}
            </ol>
            {limit !== undefined && entries.length >= limit && shown >= entries.length && (
              <p className="mt-3 text-xs text-muted-foreground">Showing the latest {limit} entries. Older history is kept but not shown here.</p>
            )}
            {entries.length > shown && (
              <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setShown(n => n + PAGE)}>
                Show more ({entries.length - shown} left)
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
