'use server'

import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { getEventById, getEventSchools, getStaffProfiles, URL_TO_TYPE_CODE } from '@/lib/supabase/queries/events'
import { getEventFormReferenceData } from '@/lib/supabase/queries/event-reference-queries'

/**
 * What the event drawer needs, loaded when it opens: the form's choices and,
 * when editing, the event as it is now with the schools taking part. A new
 * event starts with the kind of the page it was started from.
 */
export async function loadEventForm(typeSlug: string, eventId?: string) {
  const denied = await assertAccess(MODULES.EVENTS, ACCESS.WRITE)
  if (denied) return denied
  const typeCode = URL_TO_TYPE_CODE[typeSlug]
  if (!typeCode) return { success: false as const, error: 'Unknown kind of event.' }

  const [refData, profiles, event, eventSchools] = await Promise.all([
    getEventFormReferenceData(eventId),
    getStaffProfiles(),
    eventId ? getEventById(eventId) : Promise.resolve(null),
    eventId ? getEventSchools(eventId) : Promise.resolve([]),
  ])
  if (eventId && !event) return { success: false as const, error: 'This event no longer exists.' }

  const pageType = refData.eventTypes.find(t => t.code === typeCode)
  return {
    success: true as const,
    data: {
      referenceData: { ...refData, profiles },
      defaultEventType: pageType ? { id: pageType.id, categoryId: pageType.category_id } : null,
      event: event ? {
        id: event.id,
        event_type_id: event.event_type_id,
        category_id: event.category_id,
        parent_event_id: event.parent_event_id,
        delivery_mode_id: event.delivery_mode_id,
        visibility_id: event.visibility_id,
        scheduling_mode_id: event.scheduling_mode_id,
        school_id: event.school_id,
        name: event.name,
        location: event.location,
        online_link: event.online_link,
        capacity: event.capacity,
        start_date: event.start_date,
        end_date: event.end_date,
        start_time: event.start_time,
        end_time: event.end_time,
        duration_minutes: event.duration_minutes,
        remarks: event.remarks,
        assigned_to: event.assigned_to,
      } : null,
      existingSchoolIds: (eventSchools as { school_id: string }[]).map(es => es.school_id),
    },
  }
}
