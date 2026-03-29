/** Represents a single time slot in the scheduler grid */
export type TimeSlot = {
  start: string  // "HH:mm" format
  end: string    // "HH:mm" format
  key: string    // unique key: "repId-HH:mm"
}

/** Parse a time string (HH:mm or ISO timestamp) into minutes since midnight */
export function parseTimeToMinutes(timeStr: string): number {
  if (timeStr.includes('T')) {
    // ISO timestamp — extract HH:mm directly to avoid timezone issues
    const timePart = timeStr.split('T')[1]
    const parts = timePart.split(':')
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
  }
  const parts = timeStr.split(':')
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
}

/** Format minutes since midnight to HH:mm string */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

/** Generate time slots from availability window and slot duration */
export function generateTimeSlots(
  availableFrom: string,
  availableTo: string,
  slotMinutes: number,
  repId: string
): TimeSlot[] {
  const startMin = parseTimeToMinutes(availableFrom)
  const endMin = parseTimeToMinutes(availableTo)
  const slots: TimeSlot[] = []

  let current = startMin
  while (current + slotMinutes <= endMin) {
    const start = minutesToTime(current)
    const end = minutesToTime(current + slotMinutes)
    slots.push({ start, end, key: `${repId}-${start}` })
    current += slotMinutes
  }

  return slots
}

/** Format time for display — extracts HH:mm from either "HH:mm" or ISO timestamp */
export function formatSlotTime(time: string): string {
  if (time.includes('T')) {
    const timePart = time.split('T')[1]
    return timePart.slice(0, 5)
  }
  return time.slice(0, 5)
}
