import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type EventAppWithJoins = {
  id: string
  student_id: string
  event_id: string | null
  status_id: number | null
  email_sent: boolean | null
  remarks: string | null
  legacy_event_name: string | null
  created_at: string | null
  updated_at: string | null
  event: {
    id: string
    name: string
    event_type_id: number
    event_types: { id: number; code: string; label: string; color: string | null } | null
  } | null
  status: { id: number; code: string; label: string } | null
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
      event:events!student_event_apps_event_id_fkey(id, name, event_type_id, event_types(id, code, label, color)),
      status:event_application_statuses!student_event_apps_status_id_fkey(id, code, label)
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

  const [eventTypes, events, statuses] = await Promise.all([
    supabase.from('event_types').select('*').order('sort_order'),
    supabase.from('events').select('id, name, event_type_id').order('name'),
    supabase.from('event_application_statuses').select('*').order('sort_order'),
  ])

  return {
    eventTypes: eventTypes.data ?? [],
    events: events.data ?? [],
    statuses: statuses.data ?? [],
  }
}
