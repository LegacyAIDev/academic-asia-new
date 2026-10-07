import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STATUS_STYLE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  pending: { variant: 'outline', className: 'border-dashed' },
  confirmed: { variant: 'default' },
  cancelled: { variant: 'destructive' },
}

/**
 * Booking status pill; pending mirrors the dashed outline the calendar uses for unconfirmed cards.
 * Pass `asChild` with a single element child (e.g. a Link) to make the pill itself the link.
 */
export function BookingStatusBadge({ status, className, children, ...props }: { status: string } & React.ComponentProps<typeof Badge>) {
  const style = STATUS_STYLE[status] ?? { variant: 'outline' as const }
  return (
    <Badge variant={style.variant} className={cn('capitalize', style.className, className)} {...props}>
      {children ?? status}
    </Badge>
  )
}
