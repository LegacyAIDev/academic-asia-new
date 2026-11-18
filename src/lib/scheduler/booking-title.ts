/**
 * A booking's title when staff leave it empty (meeting, 18 Nov: exams and room
 * bookings need none): its type, then who and where, e.g.
 * "Examination · Lucas Ng · Headington School" or "Room reservation · Exam Room".
 */
export function defaultBookingTitle(typeLabel: string, parts: (string | null | undefined)[]): string {
  return [typeLabel, ...parts.map(part => part?.trim()).filter(Boolean)].join(' · ').slice(0, 200)
}
