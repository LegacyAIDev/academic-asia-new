'use client'

import { useEffect, useMemo, useState } from 'react'
import { useWatch } from 'react-hook-form'
import { useDebouncedCallback } from 'use-debounce'
import { checkAvailability } from '@/lib/supabase/actions/scheduler-availability'
import type { ConflictSummary } from '@/lib/scheduler/conflicts'
import type { BookingForm } from './booking-dialog'

/**
 * Live "who's already busy" check for the current organiser/student/attendees
 * and time range, debounced 400ms. `setConflicts` lets the dialog overwrite
 * this with the server's authoritative list after a CONFLICT save result.
 */
export function useBookingConflicts(form: BookingForm, excludeBookingId: string | null) {
  const [conflicts, setConflicts] = useState<ConflictSummary | null>(null)

  const startAt = useWatch({ control: form.control, name: 'start_at' })
  const endAt = useWatch({ control: form.control, name: 'end_at' })
  const organiserId = useWatch({ control: form.control, name: 'organiser_id' })
  const studentId = useWatch({ control: form.control, name: 'student_id' })
  const watchedAttendees = useWatch({ control: form.control, name: 'attendees' })
  const attendees = useMemo(() => watchedAttendees ?? [], [watchedAttendees])

  const check = useDebouncedCallback(async () => {
    const profileIds = [organiserId, ...attendees.map(a => a.profile_id)].filter((id): id is string => Boolean(id))
    const studentIds = [studentId, ...attendees.map(a => a.student_id)].filter((id): id is string => Boolean(id))
    if (!startAt || !endAt || (profileIds.length === 0 && studentIds.length === 0)) {
      setConflicts(null)
      return
    }
    const result = await checkAvailability({ from: startAt, to: endAt, profileIds, studentIds, excludeBookingId })
    if (result.success) setConflicts(result.data ?? null)
  }, 400)

  useEffect(() => {
    check()
  }, [startAt, endAt, organiserId, studentId, attendees, check])

  return { conflicts, setConflicts }
}
