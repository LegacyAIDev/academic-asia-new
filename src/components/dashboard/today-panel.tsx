import Link from "next/link"
import { CalendarClock } from "lucide-react"
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
        <div className="flex flex-1 flex-col items-start justify-center gap-2 py-4">
          <CalendarClock className="h-7 w-7 text-muted-foreground/70" aria-hidden="true" />
          <p className="font-medium">Nothing booked for you today</p>
          <p className="text-sm text-muted-foreground">Meetings and exams you organise or attend show here.</p>
        </div>
      ) : (
        <ol className="space-y-3">
          {bookings.map(b => (
            <li key={b.id}>
              <Link href={`/scheduler/bookings/${b.id}`} className="flex gap-4 rounded-lg px-2 py-2 -mx-2 hover:bg-muted/60">
                <span className="w-24 shrink-0 text-sm font-medium tabular-nums text-brand-navy">
                  {formatHkTime(b.startAt)}–{formatHkTime(b.endAt)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{b.title}</span>
                  <span className="block text-sm text-muted-foreground">
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
