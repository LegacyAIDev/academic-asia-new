import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type EventAppWithJoins = {
  id: string
  student_id: string
  event_id: string | null
  status_id: number | null
  email_sent: boolean | null
  representative_id: string | null
  preferred_time: string | null
  seats_requested: number | null
  seats_assigned: number | null
  pieces: { piece: string; composer: string }[] | null
  remarks: string | null
  legacy_event_name: string | null
  created_at: string | null
  updated_at: string | null
  event: {
    id: string
    name: string
    event_type_id: number
    start_date: string | null
    start_time: string | null
    end_time: string | null
    capacity: number | null
    school_id: string | null
    event_types: { id: number; code: string; label: string; color: string | null; category_id: number | null } | null
    school: { id: string; name: string } | null
  } | null
  status: { id: number; code: string; label: string } | null
  representative: { id: string; name: string } | null
}

/**
 * Fetch all event applications for a student with joined event, event_type and status
 */
export async function getStudentEventApplications(studentId: string): Promise<EventAppWithJoins[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('student_event_applications')
    .select(`
      *,
      event:events!student_event_apps_event_id_fkey(
        id, name, event_type_id, start_date, start_time, end_time, capacity, school_id,
        event_types(id, code, label, color, category_id),
        school:schools!events_school_id_fkey(id, name)
      ),
      status:event_application_statuses!student_event_apps_status_id_fkey(id, code, label),
      representative:event_representatives!student_event_applications_representative_id_fkey(id, name)
    `)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching student event applications:', error)
    return []
  }

  return (data ?? []) as unknown as EventAppWithJoins[]
}

/**
 * Fetch reference data for the event application form dropdowns
 */
export async function getEventAppReferenceData() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const [eventTypes, events, statuses, representatives] = await Promise.all([
    supabase.from('event_types').select('*').order('sort_order'),
    supabase.from('events').select('id, name, event_type_id, start_date, start_time, end_time, capacity, school_id, school:schools!events_school_id_fkey(name)').order('name'),
    supabase.from('event_application_statuses').select('*').order('sort_order'),
    supabase.from('event_representatives').select('id, event_id, name').order('name'),
  ])

  // Supabase returns joined school as array — unwrap to single object
  const mappedEvents = (events.data ?? []).map((e) => {
    const ev = e as Record<string, unknown>
    return {
      id: ev.id as string,
      name: ev.name as string,
      event_type_id: ev.event_type_id as number,
      start_date: (ev.start_date as string) ?? null,
      start_time: (ev.start_time as string) ?? null,
      end_time: (ev.end_time as string) ?? null,
      capacity: (ev.capacity as number) ?? null,
      school_id: (ev.school_id as string) ?? null,
      school: Array.isArray(ev.school) ? ev.school[0] ?? null : ev.school ?? null,
    }
  })

  return {
    eventTypes: eventTypes.data ?? [],
    events: mappedEvents,
    statuses: statuses.data ?? [],
    representatives: representatives.data ?? [],
  }
}
