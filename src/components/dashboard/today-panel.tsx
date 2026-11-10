import Link from "next/link"
import { BOOKING_TYPE_LABELS, type BookingType } from "@/lib/scheduler/config"
import { formatHkTime } from "@/lib/scheduler/time-utils"
import type { TodayBooking } from "@/lib/supabase/queries/dashboard"
import { DashboardPanel } from "./dashboard-panel"

/** The signed-in person's own bookings today, so the day's plan is one glance away. */
export function TodayPanel({ bookings }: { bookings: TodayBooking[] | null }) {
  return (
    <DashboardPanel title="Your day" link={{ href: "/scheduler", label: "Open calendar" }}>
      {bookings === null ? (
        <p className="text-sm text-muted-foreground">Your bookings could not be loaded. Open the calendar to see them.</p>
      ) : bookings.length === 0 ? (
        <div>
          <p className="text-sm font-medium">Nothing booked for you today</p>
          <p className="mt-0.5 text-sm text-muted-foreground">Meetings and exams you organise or attend appear here.</p>
        </div>
      ) : (
        <ol className="-mx-3">
          {bookings.map(b => (
            <li key={b.id}>
              <Link href={`/scheduler/bookings/${b.id}`} className="flex gap-4 rounded-md px-3 py-2.5 hover:bg-muted/60">
                <span className="w-[5.5rem] shrink-0 pt-px text-sm tabular-nums text-brand-navy">
                  {formatHkTime(b.startAt)}–{formatHkTime(b.endAt)}
                </span>
                <span className="min-w-0 border-l border-brand-gold/60 pl-3">
                  <span className="block truncate text-sm font-medium">{b.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {BOOKING_TYPE_LABELS[b.bookingType as BookingType] ?? "Booking"}{b.place ? `, ${b.place}` : ""}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </DashboardPanel>
  )
}
