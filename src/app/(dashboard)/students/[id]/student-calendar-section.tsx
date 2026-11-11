import Link from 'next/link'
import { Panel } from '@/components/ui/panel'
import { addDays, format } from 'date-fns'
import { TZDate } from '@date-fns/tz'
import { Button } from '@/components/ui/button'
import { BOOKING_TYPE_LABELS, SCHEDULER_TIMEZONE, TIMEZONE_LABEL, type BookingType } from '@/lib/scheduler/config'
import { colorForType } from '@/lib/scheduler/colors'
import { bookingPageHref } from '@/lib/scheduler/return-path'
import { formatHkDate, formatHkTime } from '@/lib/scheduler/time-utils'
import { getCalendarItems, type CalendarItem } from '@/lib/supabase/queries/scheduler-bookings'
import { ScheduleBookingButton } from '@/components/scheduler/schedule-booking-button'
import { BookingStatusBadge } from '@/components/scheduler/booking-status-badge'
import { RoomChip } from '@/components/scheduler/room-chip'
import { canAccess } from '@/lib/permissions/guard'
import { MODULES } from '@/lib/permissions/modules'

type Props = {
  studentId: string
  canBook: boolean
  /** First day shown (YYYY-MM-DD) from the address; defaults to two weeks ago. */
  start?: string
}

/** Days in one view, and the step of Earlier / Later. */
const SPAN = 60

const SOURCE_LABELS: Record<string, string> = { booking: 'Scheduler', exam: 'Exams', event_schedule: 'Event' }
const EYEBROW = 'text-sm font-medium text-foreground'

function groupByDate(items: CalendarItem[]): [string, CalendarItem[]][] {
  const groups = new Map<string, CalendarItem[]>()
  for (const item of items) {
    const key = item.local_date ?? ''
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  return [...groups.entries()]
}

/** Agenda of everything scheduled for one student: bookings, confirmed exams and event slots. */
export async function StudentCalendarSection({ studentId, canBook, start }: Props) {
  if (!(await canAccess(MODULES.SCHEDULER))) {
    return <p className="text-sm text-muted-foreground">You do not have access to the scheduler.</p>
  }
  const today = new TZDate(new Date(), SCHEDULER_TIMEZONE)
  const defaultFrom = format(addDays(today, -14), 'yyyy-MM-dd')
  const from = start && /^\d{4}-\d{2}-\d{2}$/.test(start) ? start : defaultFrom
  const fromDate = new Date(`${from}T00:00:00`)
  const to = format(addDays(fromDate, SPAN - 1), 'yyyy-MM-dd')
  const shift = (days: number) => `/students/${studentId}?tab=calendar&from=${format(addDays(fromDate, days), 'yyyy-MM-dd')}`
  const items = await getCalendarItems({ from, to, studentIds: [studentId] })
  const groups = groupByDate(items)

  return (
    <Panel
      title="Calendar"
      action={
        <>
          <Button asChild variant="ghost" size="sm" className="h-8">
            <Link href={`/scheduler?view=team&people=s:${studentId}`}>Open in scheduler</Link>
          </Button>
          {canBook && (
            <ScheduleBookingButton
              label="Book consultation"
              variant="outline"
              initial={{ booking_type: 'consultation', student_id: studentId }}
            />
          )}
        </>
      }
    >
      <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {formatHkDate(from)} to {formatHkDate(to)}, {TIMEZONE_LABEL}
        </p>
        <nav aria-label="Dates shown" className="flex items-center gap-1">
          <Button asChild variant="outline" size="sm" className="h-8">
            <Link href={shift(-SPAN)} scroll={false}>Earlier</Link>
          </Button>
          {from !== defaultFrom && (
            <Button asChild variant="ghost" size="sm" className="h-8">
              <Link href={`/students/${studentId}?tab=calendar`} scroll={false}>Today</Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className="h-8">
            <Link href={shift(SPAN)} scroll={false}>Later</Link>
          </Button>
        </nav>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
          <p className="text-sm font-medium">Nothing scheduled in this period.</p>
          <p className="mt-1 text-sm text-muted-foreground">Book a consultation to add the first one.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(([date, dayItems]) => (
            <div key={date}>
              <p className={`mb-2 ${EYEBROW}`}>{formatHkDate(date)}</p>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {dayItems.map(item => (
                  <li key={`${item.source}:${item.source_id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2.5 text-sm">
                    <span className="w-[104px] shrink-0 text-xs text-muted-foreground tabular-nums">
                      {item.start_at ? formatHkTime(item.start_at) : ''}–{item.end_at ? formatHkTime(item.end_at) : ''}
                    </span>
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colorForType(item.booking_type ?? 'other') }} aria-hidden />
                    <span className="flex min-w-0 flex-1 basis-[160px] flex-col">
                      {item.booking_id ? (
                        <Link href={bookingPageHref(item.booking_id, `/students/${studentId}?tab=calendar`)} className="truncate font-medium underline-offset-2 hover:text-primary hover:underline">
                          {item.title}
                        </Link>
                      ) : (
                        <span className="truncate font-medium">{item.title}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {BOOKING_TYPE_LABELS[item.booking_type as BookingType] ?? item.booking_type}
                      </span>
                    </span>
                    {item.room_name && <RoomChip display_name={item.room_name} floor={item.floor} room_number={item.room_number} size="sm" />}
                    {item.status === 'pending' && <BookingStatusBadge status="pending" className="text-[11px]" />}
                    <span className={`ml-auto ${EYEBROW}`}>{SOURCE_LABELS[item.source ?? ''] ?? item.source}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      </div>
    </Panel>
  )
}
