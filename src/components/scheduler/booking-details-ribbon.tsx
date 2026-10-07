import { Badge } from '@/components/ui/badge'
import { BOOKING_TYPE_LABELS, type BookingType } from '@/lib/scheduler/config'
import { colorForType } from '@/lib/scheduler/colors'
import { BookingStatusBadge } from './booking-status-badge'
import { RoomChip } from './room-chip'

type RibbonRoom = { display_name: string; floor: string | null; room_number: string | null; capacity: number } | null

type Props = {
  bookingType: string
  status?: string | null
  isExclusive?: boolean
  room?: RibbonRoom
  seatsUsed?: number | null
}

/** Type badge with its colour dot, status and the room chip — the header strip of every booking view. */
export function BookingDetailsRibbon({ bookingType, status, isExclusive, room, seatsUsed }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/60 px-3 py-2">
      <Badge variant="secondary" className="gap-1.5 bg-card">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorForType(bookingType) }} aria-hidden />
        {BOOKING_TYPE_LABELS[bookingType as BookingType] ?? bookingType}
      </Badge>
      {status && <BookingStatusBadge status={status} />}
      {isExclusive && <Badge variant="outline">Whole room</Badge>}
      {room && (
        <RoomChip
          className="ml-auto"
          size="sm"
          display_name={room.display_name}
          floor={room.floor}
          room_number={room.room_number}
          capacity={room.capacity}
          used={seatsUsed}
        />
      )}
    </div>
  )
}
