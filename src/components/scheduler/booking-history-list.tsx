import { formatHkDate, formatHkTime } from '@/lib/scheduler/time-utils'
import type { SchedulerBookingHistoryEntry } from '@/lib/supabase/queries/scheduler-history'
import { cn } from '@/lib/utils'

const ACTION_LABELS: Record<string, string> = {
  created: 'Created',
  confirmed: 'Confirmed',
  rescheduled: 'Rescheduled',
  updated: 'Updated',
  cancelled: 'Cancelled',
}

function reasonOf(changes: unknown): string | null {
  if (changes && typeof changes === 'object' && 'reason' in changes) {
    const reason = (changes as { reason?: unknown }).reason
    return typeof reason === 'string' && reason ? reason : null
  }
  return null
}

/** Chronological audit trail of a booking as a dot-and-line timeline (spec CAL-11). */
export function BookingHistoryList({ history }: { history: SchedulerBookingHistoryEntry[] }) {
  if (history.length === 0) return <p className="text-sm text-muted-foreground">No history yet.</p>

  return (
    <ol className="relative ml-1 space-y-4 border-l border-border pl-4 text-sm">
      {history.map((entry, index) => {
        const actor = entry.actor ? `${entry.actor.first_name ?? ''} ${entry.actor.surname ?? ''}`.trim() : 'System'
        const reason = reasonOf(entry.changes)
        const latest = index === history.length - 1
        return (
          <li key={entry.id} className="relative">
            <span
              aria-hidden
              className={cn(
                'absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card',
                latest ? 'bg-primary' : entry.action === 'cancelled' ? 'bg-destructive' : 'bg-muted-foreground/60',
              )}
            />
            <p className="font-medium leading-tight">{ACTION_LABELS[entry.action] ?? entry.action}</p>
            <p className="text-xs text-muted-foreground">
              {actor} · <span className="tabular-nums">{formatHkDate(entry.at)} {formatHkTime(entry.at)}</span>
            </p>
            {reason && (
              <blockquote className="mt-1.5 border-l-2 border-border pl-2.5 text-xs italic text-muted-foreground">{reason}</blockquote>
            )}
          </li>
        )
      })}
    </ol>
  )
}
