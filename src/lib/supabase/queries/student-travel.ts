import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type TravelWithJoins = {
  id: string
  student_id: string
  journey_no: number | null
  route: number | null
  requires_pickup: boolean | null
  status_id: number | null
  airline_id: number | null
  flight_number: string | null
  airport_id: number | null
  arrival_date: string | null
  arrival_time: string | null
  pickup_status_id: number | null
  pickup_provider_id: number | null
  pickup_by: string | null
  meeting_point_details: string | null
  fee: number | null
  remarks: string | null
  legacy_airline: string | null
  legacy_airport: string | null
  legacy_pickup_status: string | null
  created_at: string | null
  updated_at: string | null
  airline: { id: number; code: string; label: string } | null
  airport: { id: number; code: string; label: string; city: string | null } | null
  status: { id: number; code: string; label: string } | null
  pickup_status_ref: { id: number; code: string; label: string } | null
  pickup_provider: { id: number; code: string; label: string } | null
}

/**
 * Fetch all travel records for a student with joined reference data
 */
export async function getStudentTravel(studentId: string): Promise<TravelWithJoins[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('student_travel')
    .select(`
      *,
      airline:airlines!student_travel_airline_id_fkey(id, code, label),
      airport:airports!student_travel_airport_id_fkey(id, code, label, city),
      status:travel_statuses!student_travel_status_id_fkey(id, code, label),
      pickup_status_ref:pickup_statuses!student_travel_pickup_status_id_fkey(id, code, label),
      pickup_provider:pickup_providers!student_travel_pickup_provider_id_fkey(id, code, label)
    `)
    .eq('student_id', studentId)
    .order('arrival_date', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('Error fetching student travel:', error)
    return []
  }

  return (data ?? []) as unknown as TravelWithJoins[]
}

/**
 * Fetch reference data for the travel form dropdowns
 */
export async function getTravelReferenceData() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const [airlines, airports, statuses, pickupStatuses, pickupProviders] = await Promise.all([
    supabase.from('airlines').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('airports').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('travel_statuses').select('*').order('sort_order'),
    supabase.from('pickup_statuses').select('*').order('sort_order'),
    supabase.from('pickup_providers').select('*').eq('is_active', true).order('sort_order'),
  ])

  return {
    airlines: airlines.data ?? [],
    airports: airports.data ?? [],
    statuses: statuses.data ?? [],
    pickupStatuses: pickupStatuses.data ?? [],
    pickupProviders: pickupProviders.data ?? [],
  }
}
