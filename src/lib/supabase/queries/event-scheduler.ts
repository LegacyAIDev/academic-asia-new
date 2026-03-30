import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type SchedulerRepresentative = {
  id: string
  name: string
  role: string | null
  venue_room: string | null
  available_from: string | null
  available_to: string | null
  slot_length_minutes: number | null
  school: { id: string; name: string } | null
}

export type SchedulerSchedule = {
  id: string
  student_id: string | null
  representative_id: string | null
  schedule_date: string | null
  start_time: string | null
  end_time: string | null
  remarks: string | null
  is_blocker: boolean
  student: {
    id: string
    first_name: string | null
    surname: string | null
    student_code: string | null
  } | null
}

export type UnassignedStudent = {
  application_id: string
  student_id: string
  first_name: string | null
  surname: string | null
  student_code: string | null
  preferred_time: string | null
  status_code: string | null
}

export type SchedulerEvent = {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  start_time: string | null
  end_time: string | null
  duration_minutes: number | null
  scheduling_mode: { code: string } | null
  event_type: { code: string; label: string } | null
}

export type SchedulerData = {
  event: SchedulerEvent | null
  representatives: SchedulerRepresentative[]
  schedules: SchedulerSchedule[]
  unassigned: UnassignedStudent[]
}

/** Fetch all data needed for the scheduler page in parallel */
export async function getSchedulerData(eventId: string): Promise<SchedulerData> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const [eventRes, repsRes, schedulesRes, appsRes] = await Promise.all([
    supabase
      .from('events')
      .select(`
        id, name, start_date, end_date, start_time, end_time, duration_minutes,
        scheduling_mode:scheduling_modes!events_scheduling_mode_id_fkey(code),
        event_type:event_types!events_event_type_id_fkey(code, label)
      `)
      .eq('id', eventId)
      .single(),

    supabase
      .from('event_representatives')
      .select(`
        id, name, role, venue_room, available_from, available_to, slot_length_minutes,
        school:schools!event_interviewers_school_id_fkey(id, name)
      `)
      .eq('event_id', eventId)
      .order('name'),

    supabase
      .from('event_schedules')
      .select(`
        id, student_id, representative_id, schedule_date, start_time, end_time, remarks, is_blocker,
        student:students!event_schedules_student_id_fkey(id, first_name, surname, student_code)
      `)
      .eq('event_id', eventId)
      .order('start_time'),

    supabase
      .from('student_event_applications')
      .select(`
        id, student_id, preferred_time,
        student:students!student_event_applications_student_id_fkey(id, first_name, surname, student_code),
        status:event_application_statuses!student_event_applications_status_id_fkey(code)
      `)
      .eq('event_id', eventId),
  ])

  if (eventRes.error) {
    console.error('Error fetching scheduler event:', eventRes.error)
  }

  const representatives = (repsRes.data ?? []) as unknown as SchedulerRepresentative[]
  const schedules = (schedulesRes.data ?? []) as unknown as SchedulerSchedule[]

  // Compute unassigned: students with applications but no schedule entry
  const scheduledStudentIds = new Set(schedules.filter(s => !s.is_blocker && s.student_id).map(s => s.student_id))
  const unassigned: UnassignedStudent[] = (appsRes.data ?? [])
    .filter(a => !scheduledStudentIds.has(a.student_id))
    .map(a => {
      const student = a.student as unknown as { id: string; first_name: string | null; surname: string | null; student_code: string | null }
      const status = a.status as unknown as { code: string } | null
      return {
        application_id: a.id,
        student_id: a.student_id,
        first_name: student?.first_name ?? null,
        surname: student?.surname ?? null,
        student_code: student?.student_code ?? null,
        preferred_time: a.preferred_time,
        status_code: status?.code ?? null,
      }
    })

  return {
    event: eventRes.data as unknown as SchedulerEvent | null,
    representatives,
    schedules,
    unassigned,
  }
}
