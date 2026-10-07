import { cn } from '@/lib/utils'

export type RoomChipProps = {
  display_name: string
  floor?: string | null
  room_number?: string | null
  capacity?: number | null
  /** Seats still free in the slot; takes precedence over `used` for the meter. */
  remaining?: number | null
  /** Seats already taken out of `capacity`. */
  used?: number | null
  size?: 'sm' | 'md'
  className?: string
}

const SIZE = {
  sm: { tag: 'text-[11px]', locator: 'px-1.5 text-[10px]', name: 'px-1.5 py-0.5', meter: 'w-12' },
  md: { tag: 'text-xs', locator: 'px-2 text-[10px]', name: 'px-2 py-1', meter: 'w-16' },
}

/**
 * Two-tone room tag ("14/F · Exam Room") with an optional capacity meter.
 * The one visual element the scheduler repeats everywhere a room is named.
 */
export function RoomChip({ display_name, floor, room_number, capacity, remaining, used, size = 'md', className }: RoomChipProps) {
  const s = SIZE[size]
  const locator = [floor, room_number].filter(Boolean).join(' ')
  const seatsUsed = remaining != null && capacity ? capacity - remaining : used ?? null
  const showMeter = Boolean(capacity && capacity > 0 && seatsUsed != null)
  const ratio = showMeter ? Math.min(Math.max(seatsUsed! / capacity!, 0), 1) : 0
  const left = showMeter ? Math.max(capacity! - seatsUsed!, 0) : null

  return (
    <span className={cn('inline-flex min-w-0 flex-col gap-1 align-middle', className)}>
      <span className={cn('inline-flex max-w-full items-stretch overflow-hidden rounded-md border border-border font-medium leading-none', s.tag)}>
        {locator && (
          <span className={cn('flex items-center bg-muted uppercase tracking-wide text-muted-foreground tabular-nums', s.locator)}>
            {locator}
          </span>
        )}
        <span className={cn('flex min-w-0 items-center bg-card text-foreground', s.name)}>
          <span className="truncate">{display_name}</span>
        </span>
      </span>
      {showMeter && (
        <span className="flex items-center gap-1.5">
          <span
            role="meter"
            aria-label="Seats booked"
            aria-valuemin={0}
            aria-valuemax={capacity!}
            aria-valuenow={seatsUsed!}
            className={cn('h-[3px] overflow-hidden rounded-full bg-muted', s.meter)}
          >
            <span className={cn('block h-full rounded-full', left === 0 ? 'bg-destructive' : 'bg-primary')} style={{ width: `${ratio * 100}%` }} />
          </span>
          <span className="text-[11px] leading-none text-muted-foreground tabular-nums">
            {left === 0 ? 'Full' : `${left} seat${left === 1 ? '' : 's'} left`}
          </span>
        </span>
      )}
    </span>
  )
}
