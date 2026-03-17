import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type EventCategory = { id: number; code: string; label: string }
export type DeliveryMode = { id: number; code: string; label: string }
export type EventVisibility = { id: number; code: string; label: string }
export type SchedulingMode = { id: number; code: string; label: string; description: string | null }
export type EventTypeWithCategory = {
  id: number; code: string; label: string; color: string | null; category_id: number | null
}

/** Fetch event categories for dropdown */
export async function getEventCategories(): Promise<EventCategory[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('event_categories')
    .select('id, code, label')
    .order('sort_order')
  if (error) { console.error('Error fetching event categories:', error); return [] }
  return data ?? []
}

/** Fetch delivery modes for dropdown */
export async function getDeliveryModes(): Promise<DeliveryMode[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('delivery_modes')
    .select('id, code, label')
    .order('sort_order')
  if (error) { console.error('Error fetching delivery modes:', error); return [] }
  return data ?? []
}

/** Fetch event visibilities for dropdown */
export async function getEventVisibilities(): Promise<EventVisibility[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('event_visibilities')
    .select('id, code, label')
    .order('sort_order')
  if (error) { console.error('Error fetching visibilities:', error); return [] }
  return data ?? []
}

/** Fetch scheduling modes for dropdown */
export async function getSchedulingModes(): Promise<SchedulingMode[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('scheduling_modes')
    .select('id, code, label, description')
    .order('sort_order')
  if (error) { console.error('Error fetching scheduling modes:', error); return [] }
  return data ?? []
}

/** Fetch event types with category_id for filtered dropdowns */
export async function getEventTypesWithCategory(): Promise<EventTypeWithCategory[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('event_types')
    .select('id, code, label, color, category_id')
    .order('sort_order')
  if (error) { console.error('Error fetching event types:', error); return [] }
  return data ?? []
}

/** Lightweight school list for dropdowns */
export async function getSchoolsDropdown(): Promise<{ id: string; name: string }[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('schools')
    .select('id, name')
    .order('name')
  if (error) { console.error('Error fetching schools:', error); return [] }
  return data ?? []
}

/** Lightweight events list for parent event dropdown */
export async function getEventsForParentDropdown(excludeId?: string): Promise<{ id: string; name: string }[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  let query = supabase
    .from('events')
    .select('id, name')
    .order('name')
  if (excludeId) {
    query = query.neq('id', excludeId)
  }
  const { data, error } = await query
  if (error) { console.error('Error fetching events for parent dropdown:', error); return [] }
  return data ?? []
}

/** Bundled reference data for event form */
export async function getEventFormReferenceData(excludeEventId?: string) {
  const [categories, eventTypes, deliveryModes, visibilities, schedulingModes, schools, parentEvents] =
    await Promise.all([
      getEventCategories(),
      getEventTypesWithCategory(),
      getDeliveryModes(),
      getEventVisibilities(),
      getSchedulingModes(),
      getSchoolsDropdown(),
      getEventsForParentDropdown(excludeEventId),
    ])
  return { categories, eventTypes, deliveryModes, visibilities, schedulingModes, schools, parentEvents }
}
