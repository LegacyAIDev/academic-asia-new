import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import type { BlockClash } from '@/lib/scheduler/blocked-times'
import { bookingPageHref } from '@/lib/scheduler/return-path'
import { formatHkDate, formatHkTime } from '@/lib/scheduler/time-utils'

/**
 * Shown after a room block is saved over existing bookings. Nothing is
 * cancelled, so staff get the list with links to move each one.
 */
export function BlockedTimeClashList({ clashes, returnTo }: { clashes: BlockClash[]; returnTo: string }) {
  if (clashes.length === 0) return null
  const count = `${clashes.length} booking${clashes.length === 1 ? '' : 's'}`

  return (
    <div role="alert" className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/40">
      <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        {count} overlap{clashes.length === 1 ? 's' : ''} this block — move {clashes.length === 1 ? 'it' : 'them'}
      </div>
      <ul className="max-h-48 space-y-1 overflow-y-auto text-amber-800 dark:text-amber-300">
        {clashes.map((clash, index) => (
          <li key={`${clash.bookingId ?? 'item'}-${clash.startAt}-${index}`} className="flex gap-2">
            <span className="shrink-0 tabular-nums">{formatHkDate(clash.startAt)} {formatHkTime(clash.startAt)}–{formatHkTime(clash.endAt)}</span>
            {clash.bookingId ? (
              <Link href={bookingPageHref(clash.bookingId, returnTo)} target="_blank" className="min-w-0 truncate underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {clash.title}
              </Link>
            ) : (
              <span className="min-w-0 truncate">{clash.title}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
