import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { PlacementYearCounts } from '@/lib/schools/placement-history'

/**
 * A school's applications, offers and placements per academic year. The
 * database counts them (function school_placement_history), because one school
 * can have far more applications than a single request returns.
 *
 * Returns null when the lookup failed, so the page can say the figures are
 * unavailable instead of showing a school as having no applications.
 */
export async function getSchoolPlacementHistory(schoolId: string): Promise<PlacementYearCounts[] | null> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase.rpc('school_placement_history', { p_school_id: schoolId })
  if (error) {
    console.error('Error fetching school placement history:', error)
    return null
  }
  // Applications without an entry year come back with a null year, which the generated type does not show.
  return (data ?? []) as PlacementYearCounts[]
}
