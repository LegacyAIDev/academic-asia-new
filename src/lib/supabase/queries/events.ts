import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

/**
 * Event type codes used for routing and filtering
 */
export const EVENT_TYPE_CODES = {
  event: 'event',
  expo: 'expo',
  top_schools: 'top_schools',
  interview: 'interview',
  music_audition: 'music_audition',
} as const

export type EventTypeCode = keyof typeof EVENT_TYPE_CODES

/**
 * Maps URL slugs to database event type codes
 */
export const URL_TO_TYPE_CODE: Record<string, EventTypeCode> = {
  'event': 'event',
  'expo': 'expo',
  'top-schools': 'top_schools',
  'interview': 'interview',
  'music-audition': 'music_audition',
}

/**
 * Human-readable labels for each event type
 */
export const EVENT_TYPE_LABELS: Record<EventTypeCode, string> = {
  event: 'General Events',
  expo: 'Education Expo',
  top_schools: 'Top Schools Weekend',
  interview: 'Individual Interview',
  music_audition: 'Music Audition',
}

/**
 * Descriptions for each event type
 */
export const EVENT_TYPE_DESCRIPTIONS: Record<EventTypeCode, string> = {
  event: 'Seminars, workshops, and general educational events',
  expo: 'Large-scale education exhibitions and fairs',
  top_schools: 'Top Schools interview weekends',
  interview: 'One-on-one school interviews',
  music_audition: 'Music scholarship auditions',
}

export type EventsListParams = {
  page?: number
  pageSize?: number
  search?: string
  typeCode?: EventTypeCode
  dateFrom?: string
  dateTo?: string
  assignedTo?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export type EventType = {
  id: number
  code: string
  label: string
  color: string | null
}

export type EventListItem = {
  id: string
  legacy_id: number | null
  name: string
  location: string | null
  start_date: string | null
  end_date: string | null
  start_time: string | null
  end_time: string | null
  duration_minutes: number | null
  remarks: string | null
  created_at: string | null
  updated_at: string | null
  event_type: EventType | null
  assigned_to_profile: { id: string; first_name: string | null; surname: string | null } | null
  school_count: number
  interviewer_count: number
  schedule_count: number
}

export type EventsListResult = {
  events: EventListItem[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Fetch paginated events list with filters
 */
export async function getEventsList(params: EventsListParams = {}): Promise<EventsListResult> {
  const {
    page = 1,
    pageSize = 50,
    search = '',
    typeCode,
    dateFrom,
    dateTo,
    assignedTo,
    sortBy = 'start_date',
    sortOrder = 'desc'
  } = params

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const offset = (page - 1) * pageSize

  // Get the event_type_id for the given type code
  let eventTypeId: number | null = null
  if (typeCode) {
    const { data: eventType } = await supabase
      .from('event_types')
      .select('id')
      .eq('code', typeCode)
      .single()
    eventTypeId = eventType?.id ?? null
  }

  // Build main query
  let query = supabase
    .from('events')
    .select(`
      id,
      legacy_id,
      name,
      location,
      start_date,
      end_date,
      start_time,
      end_time,
      duration_minutes,
      remarks,
      created_at,
      updated_at,
      event_type:event_types!events_event_type_id_fkey(id, code, label, color),
      assigned_to_profile:profiles!events_assigned_to_fkey(id, first_name, surname)
    `, { count: 'exact' })

  // Filter by event type
  if (eventTypeId) {
    query = query.eq('event_type_id', eventTypeId)
  }

  // Apply search filter
  if (search) {
    query = query.or(`name.ilike.%${search}%,location.ilike.%${search}%`)
  }

  // Apply date filters
  if (dateFrom) {
    query = query.gte('start_date', dateFrom)
  }
  if (dateTo) {
    query = query.lte('start_date', dateTo)
  }

  // Filter by assigned staff
  if (assignedTo) {
    query = query.eq('assigned_to', assignedTo)
  }

  // Apply sorting
  const validSortColumns = ['start_date', 'end_date', 'name', 'created_at', 'updated_at']
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'start_date'
  query = query.order(sortColumn, { ascending: sortOrder === 'asc', nullsFirst: false })

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching events:', error)
    throw new Error(`Failed to fetch events: ${error.message}`)
  }

  // Get event IDs for aggregation queries
  const eventIds = (data ?? []).map(e => e.id)

  // Fetch aggregated counts for each event in parallel
  const [schoolCounts, interviewerCounts, scheduleCounts] = await Promise.all([
    getEventSchoolCounts(supabase, eventIds),
    getEventInterviewerCounts(supabase, eventIds),
    getEventScheduleCounts(supabase, eventIds),
  ])

  // Merge counts into event data
  const eventsWithCounts: EventListItem[] = (data ?? []).map(event => ({
    ...event,
    event_type: event.event_type as unknown as EventType | null,
    assigned_to_profile: event.assigned_to_profile as unknown as { id: string; first_name: string | null; surname: string | null } | null,
    school_count: schoolCounts[event.id] ?? 0,
    interviewer_count: interviewerCounts[event.id] ?? 0,
    schedule_count: scheduleCounts[event.id] ?? 0,
  }))

  const totalCount = count ?? 0
  const totalPages = Math.ceil(totalCount / pageSize)

  return {
    events: eventsWithCounts,
    totalCount,
    page,
    pageSize,
    totalPages
  }
}

/**
 * Helper: Get school counts per event
 */
async function getEventSchoolCounts(
  supabase: ReturnType<typeof createClient>,
  eventIds: string[]
): Promise<Record<string, number>> {
  if (eventIds.length === 0) return {}

  const { data } = await supabase
    .from('event_schools')
    .select('event_id')
    .in('event_id', eventIds)

  const counts: Record<string, number> = {}
  data?.forEach(row => {
    counts[row.event_id] = (counts[row.event_id] ?? 0) + 1
  })
  return counts
}

/**
 * Helper: Get interviewer counts per event
 */
async function getEventInterviewerCounts(
  supabase: ReturnType<typeof createClient>,
  eventIds: string[]
): Promise<Record<string, number>> {
  if (eventIds.length === 0) return {}

  const { data } = await supabase
    .from('event_interviewers')
    .select('event_id')
    .in('event_id', eventIds)

  const counts: Record<string, number> = {}
  data?.forEach(row => {
    counts[row.event_id] = (counts[row.event_id] ?? 0) + 1
  })
  return counts
}

/**
 * Helper: Get schedule counts per event
 */
async function getEventScheduleCounts(
  supabase: ReturnType<typeof createClient>,
  eventIds: string[]
): Promise<Record<string, number>> {
  if (eventIds.length === 0) return {}

  const { data } = await supabase
    .from('event_schedules')
    .select('event_id')
    .in('event_id', eventIds)

  const counts: Record<string, number> = {}
  data?.forEach(row => {
    counts[row.event_id] = (counts[row.event_id] ?? 0) + 1
  })
  return counts
}

/**
 * Get stats for events by type
 */
export async function getEventStats(typeCode?: EventTypeCode) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Get the event_type_id for the given type code
  let eventTypeId: number | null = null
  if (typeCode) {
    const { data: eventType } = await supabase
      .from('event_types')
      .select('id')
      .eq('code', typeCode)
      .single()
    eventTypeId = eventType?.id ?? null
  }

  // Build base query for total count
  let totalQuery = supabase.from('events').select('id', { count: 'exact', head: true })
  if (eventTypeId) {
    totalQuery = totalQuery.eq('event_type_id', eventTypeId)
  }
  const { count: totalCount } = await totalQuery

  // Get upcoming events count (start_date >= today)
  const today = new Date().toISOString().split('T')[0]
  let upcomingQuery = supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .gte('start_date', today)
  if (eventTypeId) {
    upcomingQuery = upcomingQuery.eq('event_type_id', eventTypeId)
  }
  const { count: upcomingCount } = await upcomingQuery

  // Get event IDs for this type to count related records
  let eventIdsQuery = supabase.from('events').select('id')
  if (eventTypeId) {
    eventIdsQuery = eventIdsQuery.eq('event_type_id', eventTypeId)
  }
  const { data: eventIdsData } = await eventIdsQuery
  const eventIds = (eventIdsData ?? []).map(e => e.id)

  // Count schools, interviewers, schedules for these events
  let schoolCount = 0
  let interviewerCount = 0
  let scheduleCount = 0

  if (eventIds.length > 0) {
    const [schools, interviewers, schedules] = await Promise.all([
      supabase.from('event_schools').select('id', { count: 'exact', head: true }).in('event_id', eventIds),
      supabase.from('event_interviewers').select('id', { count: 'exact', head: true }).in('event_id', eventIds),
      supabase.from('event_schedules').select('id', { count: 'exact', head: true }).in('event_id', eventIds),
    ])
    schoolCount = schools.count ?? 0
    interviewerCount = interviewers.count ?? 0
    scheduleCount = schedules.count ?? 0
  }

  return {
    totalEvents: totalCount ?? 0,
    upcomingEvents: upcomingCount ?? 0,
    totalSchools: schoolCount,
    totalInterviewers: interviewerCount,
    totalSchedules: scheduleCount,
  }
}

/**
 * Get all event types for reference
 */
export async function getEventTypes() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('event_types')
    .select('*')
    .order('sort_order')

  if (error) {
    console.error('Error fetching event types:', error)
    return []
  }

  return data ?? []
}

/**
 * Get single event with all relations
 */
export async function getEventById(id: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      event_type:event_types!events_event_type_id_fkey(id, code, label, color),
      assigned_to_profile:profiles!events_assigned_to_fkey(id, first_name, surname, email_1)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching event:', error)
    return null
  }

  return data
}

/**
 * Get schools participating in an event
 */
export async function getEventSchools(eventId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('event_schools')
    .select(`
      *,
      school:schools!event_schools_school_id_fkey(id, name, city, country:countries!schools_country_id_fkey(label))
    `)
    .eq('event_id', eventId)

  if (error) {
    console.error('Error fetching event schools:', error)
    return []
  }

  return data ?? []
}

/**
 * Get interviewers for an event
 */
export async function getEventInterviewers(eventId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('event_interviewers')
    .select(`
      *,
      school:schools!event_interviewers_school_id_fkey(id, name)
    `)
    .eq('event_id', eventId)

  if (error) {
    console.error('Error fetching event interviewers:', error)
    return []
  }

  return data ?? []
}

/**
 * Get staff profiles for dropdown selections
 */
export async function getStaffProfiles() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, surname')
    .order('surname')

  if (error) {
    console.error('Error fetching staff profiles:', error)
    return []
  }

  return data ?? []
}

/**
 * Get event type ID by code
 */
export async function getEventTypeIdByCode(code: string): Promise<number | null> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('event_types')
    .select('id')
    .eq('code', code)
    .single()

  if (error) {
    console.error('Error fetching event type:', error)
    return null
  }

  return data?.id ?? null
}
