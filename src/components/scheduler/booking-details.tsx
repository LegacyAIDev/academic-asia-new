import Link from 'next/link'
import { TIMEZONE_LABEL } from '@/lib/scheduler/config'
import { formatHkDate, formatHkTime } from '@/lib/scheduler/time-utils'
import type { BookingDetail } from '@/lib/supabase/queries/scheduler-bookings'
import { BookingDetailsRibbon } from './booking-details-ribbon'

const fullName = (p: { first_name: string | null; surname: string | null } | null | undefined) =>
  p ? `${p.first_name ?? ''} ${p.surname ?? ''}`.trim() || '—' : '—'

function Fact({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 min-w-0 break-words text-sm">{children}</dd>
    </div>
  )
}

/** Read-only booking facts shared by the side panel and the booking page (spec CAL-07, CAL-08). */
export function BookingDetails({ booking }: { booking: BookingDetail }) {
  const room = booking.room
  const seats = booking.attendees.filter(a => a.seat_no !== null)
  const isOnline = booking.location_type === 'online'
  const safeLink = booking.online_link && /^https?:\/\//i.test(booking.online_link) ? booking.online_link : null
  const seatsUsed = seats.length > 0 ? seats.length : booking.seats_required

  return (
    <div className="space-y-4">
      <BookingDetailsRibbon
        bookingType={booking.booking_type}
        status={booking.status}
        isExclusive={booking.is_exclusive}
        room={isOnline ? null : room}
        seatsUsed={booking.is_exclusive ? room?.capacity : seatsUsed}
      />

      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        <Fact label="Date">{formatHkDate(booking.start_at)}</Fact>
        <Fact label="Time">
          <span className="tabular-nums">{formatHkTime(booking.start_at)} – {formatHkTime(booking.end_at)}</span>
          <span className="text-muted-foreground"> {TIMEZONE_LABEL}</span>
        </Fact>

        {isOnline ? (
          <Fact label="Online" wide>
            {safeLink ? <a href={safeLink} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">{safeLink}</a> : 'Online'}
          </Fact>
        ) : (
          <>
            <Fact label="Location">
              {room?.location ? `${room.location.name}${room.location.address ? `, ${room.location.address}` : ''}` : '—'}
            </Fact>
            <Fact label="Seats">
              <span className="tabular-nums">
                {seats.length > 0 ? seats.map(s => `#${s.seat_no}`).join(', ') : `${booking.seats_required} of ${room?.capacity ?? '?'}`}
              </span>
            </Fact>
          </>
        )}

        <Fact label="Organiser">{fullName(booking.organiser)}</Fact>

        {booking.student && (
          <Fact label="Student">
            <Link href={`/students/${booking.student.id}`} className="text-primary underline underline-offset-2">
              {fullName(booking.student)} {booking.student.student_code ? `(${booking.student.student_code})` : ''}
            </Link>
            {booking.application_id && (
              <>
                {' · '}
                <Link href={`/students/${booking.student.id}?tab=applications#app-${booking.application_id}`} className="text-primary underline underline-offset-2">
                  Application
                </Link>
              </>
            )}
          </Fact>
        )}

        {booking.school && <Fact label="School">{booking.school.name ?? '—'}</Fact>}

        {booking.attendees.length > 0 && (
          <Fact label="Attendees" wide>
            <ul className="space-y-0.5">
              {booking.attendees.map(a => (
                <li key={a.id}>
                  {a.profile ? fullName(a.profile) : fullName(a.student)}
                  <span className="text-muted-foreground"> · {a.role}{a.seat_no ? ` · seat ${a.seat_no}` : ''}</span>
                </li>
              ))}
            </ul>
          </Fact>
        )}

        {booking.assessment_snapshot && typeof booking.assessment_snapshot === 'object' && 'label' in booking.assessment_snapshot && (
          <Fact label="Assessment" wide>{String((booking.assessment_snapshot as { label: string }).label)}</Fact>
        )}
        {booking.notes && <Fact label="Notes" wide>{booking.notes}</Fact>}
        {booking.instructions && <Fact label="Instructions" wide>{booking.instructions}</Fact>}
        {booking.confirmed_at && (
          <Fact label="Confirmed" wide>
            {fullName(booking.confirmer)} · <span className="tabular-nums">{formatHkDate(booking.confirmed_at)} {formatHkTime(booking.confirmed_at)}</span>
          </Fact>
        )}
      </dl>
    </div>
  )
}
