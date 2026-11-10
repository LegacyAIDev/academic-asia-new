import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ACTIVITY_SELECT, hiddenActivityKinds, toActivityEntry, type ActivityEntry, type ActivityRow } from '@/lib/activity/activity-format'
import { EXAM_BOOKING_TYPES } from '@/lib/scheduler/config'
import { personName } from '@/lib/scheduler/person-name'
import { groupActivity } from '@/lib/dashboard/group-activity'
import { JOURNEY_STAGES, journeyFor, stageLabel, type JourneyStage } from '@/lib/applications/application-journey'

/**
 * Real numbers for the dashboard, each only for what the viewer may see (the
 * page passes their rights). A count that cannot be read is null, so the tile
 * can say so rather than show a wrong number.
 */

const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10)

export type DashboardCounts = {
  activeStudents: number | null
  /** Id of the Active status, so the tile can open the list filtered to it. */
  activeStatusId: number | null
  /** Students added since the 1st of this month (Hong Kong). */
  studentsAddedThisMonth: number | null
  examsNext7Days: number | null
  eventsNext30Days: number | null
}

export async function getDashboardCounts(
  rights: { students: boolean; scheduler: boolean; events: boolean },
  today: string,
): Promise<DashboardCounts> {
  const supabase = createClient(await cookies())
  const count = async (query: PromiseLike<{ count: number | null; error: unknown }>) => {
    const { count: n, error } = await query
    if (error) console.error('Dashboard count failed:', error)
    return error ? null : n ?? 0
  }

  const activeStatusId = rights.students
    ? (await supabase.from('student_statuses').select('id').eq('code', 'active').maybeSingle()).data?.id ?? null
    : null
  const [activeStudents, studentsAddedThisMonth, examsNext7Days, eventsNext30Days] = await Promise.all([
    rights.students && activeStatusId !== null
      ? count(supabase.from('students').select('id', { count: 'exact', head: true }).eq('status_id', activeStatusId))
      : null,
    rights.students
      ? count(supabase.from('students').select('id', { count: 'exact', head: true }).gte('created_at', `${today.slice(0, 8)}01T00:00:00+08:00`))
      : null,
    rights.scheduler
      ? count(supabase.from('scheduler_bookings').select('id', { count: 'exact', head: true })
          .in('booking_type', EXAM_BOOKING_TYPES).neq('status', 'cancelled')
          .gte('local_date', today).lte('local_date', addDays(today, 6)))
      : null,
    rights.events
      ? count(supabase.from('events').select('id', { count: 'exact', head: true }).gte('start_date', today).lte('start_date', addDays(today, 30)))
      : null,
  ])
  return { activeStudents, activeStatusId, studentsAddedThisMonth, examsNext7Days, eventsNext30Days }
}

export type TodayBooking = {
  id: string
  title: string
  startAt: string
  endAt: string
  bookingType: string
  place: string | null
}

/** The signed-in person's own bookings today (as organiser or attendee), earliest first. */
export async function getMyBookingsToday(profileId: string, today: string): Promise<TodayBooking[] | null> {
  const supabase = createClient(await cookies())
  const { data: seats, error: seatsError } = await supabase
    .from('scheduler_booking_attendees').select('booking_id').eq('profile_id', profileId)
  if (seatsError) {
    console.error('Dashboard bookings failed:', seatsError)
    return null
  }
  const attending = [...new Set((seats ?? []).map(s => s.booking_id))]
  const mine = [`organiser_id.eq.${profileId}`, ...(attending.length ? [`booking_id.in.(${attending.join(',')})`] : [])].join(',')
  const { data, error } = await supabase
    .from('scheduler_calendar_items')
    .select('booking_id, title, start_at, end_at, booking_type, room_name, location_type')
    .eq('local_date', today)
    .eq('source', 'booking')
    .or(mine)
    .order('start_at')
    .limit(8)
  if (error) {
    console.error('Dashboard bookings failed:', error)
    return null
  }
  return (data ?? []).map(row => ({
    id: row.booking_id as string,
    title: row.title ?? 'Booking',
    startAt: row.start_at as string,
    endAt: row.end_at as string,
    bookingType: row.booking_type ?? 'other',
    place: row.location_type === 'online' ? 'Online' : row.room_name ?? null,
  }))
}

/** `subject` names the student or school the change belongs to. */
export type RecentActivity = ActivityEntry & { href: string | null; subject: string | null; count: number }

const STUDENT_KINDS = ['students', 'student_applications', 'student_individual_exams', 'student_contacts', 'student_documents', 'filed_emails']
const SCHOOL_KINDS = ['schools', 'school_contacts', 'school_documents', 'school_entrance_exams', 'school_exam_papers']

/** The latest changes across records the viewer may see, repeats folded together, each linking to its record. */
export async function getRecentActivity(
  rights: { students: boolean; schools: boolean; scheduler: boolean; examPapers: boolean },
  limit = 6,
): Promise<RecentActivity[] | null> {
  const hidden = [
    ...hiddenActivityKinds({ examPapers: rights.examPapers, scheduler: rights.scheduler }),
    ...(rights.students ? [] : STUDENT_KINDS),
    ...(rights.schools ? [] : SCHOOL_KINDS),
  ]
  const supabase = createClient(await cookies())
  let query = supabase.from('activity_log').select(`${ACTIVITY_SELECT}, student_id, school_id, application_id`)
  if (hidden.length) query = query.not('entity', 'in', `(${[...new Set(hidden)].join(',')})`)
  const { data, error } = await query.order('occurred_at', { ascending: false }).order('id', { ascending: false }).limit(limit * 4)
  if (error) {
    console.error('Dashboard activity failed:', error.message)
    return null
  }
  type Row = ActivityRow & { student_id: string | null; school_id: string | null; application_id: string | null }
  const rows = data as unknown as Row[]
  const studentIds = [...new Set(rows.flatMap(r => r.student_id ? [r.student_id] : []))]
  const schoolIds = [...new Set(rows.flatMap(r => !r.student_id && r.school_id ? [r.school_id] : []))]
  const [studentsRes, schoolsRes] = await Promise.all([
    studentIds.length ? supabase.from('students').select('id, first_name, surname').in('id', studentIds) : null,
    schoolIds.length ? supabase.from('schools').select('id, name').in('id', schoolIds) : null,
  ])
  // A name that cannot be read just leaves the line without one.
  const names = new Map<string, string>([
    ...(studentsRes?.data ?? []).map(s => [s.id, personName(s)] as [string, string]),
    ...(schoolsRes?.data ?? []).map(s => [s.id, s.name ?? ''] as [string, string]),
  ])
  return groupActivity(rows.map(row => ({
    ...toActivityEntry(row),
    subject: names.get(row.student_id ?? row.school_id ?? '') || null,
    href: row.student_id && row.application_id ? `/students/${row.student_id}/applications/${row.application_id}`
      : row.student_id ? `/students/${row.student_id}`
      : row.school_id ? `/schools/${row.school_id}`
      : null,
  })), limit)
}

export type PipelineStage = { stage: JourneyStage; label: string; count: number }

/**
 * Applications still in progress, by step of the journey (Preparing → Family
 * decision). Placed and closed ones are left out: they need nobody's time.
 * Null when any count fails, so a half-drawn pipeline is never shown.
 */
export async function getApplicationPipeline(): Promise<PipelineStage[] | null> {
  const supabase = createClient(await cookies())
  const { data: statuses, error } = await supabase.from('application_statuses').select('id, code')
  if (error) {
    console.error('Dashboard pipeline failed:', error.message)
    return null
  }
  const idsByStage = new Map<JourneyStage, number[]>()
  for (const status of statuses ?? []) {
    const { stage, outcome } = journeyFor(status.code)
    if (stage && outcome === 'open') idsByStage.set(stage, [...(idsByStage.get(stage) ?? []), status.id])
  }
  const counts = await Promise.all(JOURNEY_STAGES.map(async stage => {
    const ids = idsByStage.get(stage) ?? []
    if (ids.length === 0) return 0
    const { count, error: countError } = await supabase.from('student_applications')
      .select('id', { count: 'exact', head: true }).in('status_id', ids).or('is_archived.is.null,is_archived.eq.false')
    if (countError) console.error('Dashboard pipeline failed:', countError.message)
    return countError ? null : count ?? 0
  }))
  if (counts.some(c => c === null)) return null
  return JOURNEY_STAGES.map((stage, i) => ({ stage, label: stageLabel(stage), count: counts[i] as number }))
}

export type ExamDay = { day: string; confirmed: number; pending: number }

/** Exam bookings per day for the next `days` days (today first), split by whether they are confirmed. */
export async function getExamLoad(today: string, days = 14): Promise<ExamDay[] | null> {
  const supabase = createClient(await cookies())
  const { data, error } = await supabase.from('scheduler_bookings')
    .select('local_date, status')
    .in('booking_type', EXAM_BOOKING_TYPES).neq('status', 'cancelled')
    .gte('local_date', today).lte('local_date', addDays(today, days - 1))
  if (error) {
    console.error('Dashboard exam load failed:', error.message)
    return null
  }
  const load = Array.from({ length: days }, (_, i) => ({ day: addDays(today, i), confirmed: 0, pending: 0 }))
  for (const row of data ?? []) {
    const slot = load.find(d => d.day === row.local_date)
    if (slot) slot[row.status === 'confirmed' ? 'confirmed' : 'pending'] += 1
  }
  return load
}
