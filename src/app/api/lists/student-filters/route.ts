import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth'
import { canAccess } from '@/lib/permissions/guard'
import { MODULES } from '@/lib/permissions/modules'
import { getStudentAdvancedFilterOptions } from '@/lib/supabase/queries/students'

/**
 * Courses, schools and events for the students "Filters" panel.
 *
 * The panel used to query these three tables from the browser on every visit
 * to the students list, a round trip to the database for each. Here they come
 * from the server's cached copy, and the browser keeps the answer for five
 * minutes, so returning to the list asks for nothing.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  if (!(await canAccess(MODULES.STUDENTS))) return NextResponse.json({ error: 'No access to students' }, { status: 403 })

  return NextResponse.json(await getStudentAdvancedFilterOptions(), {
    headers: { 'Cache-Control': 'private, max-age=300' },
  })
}
