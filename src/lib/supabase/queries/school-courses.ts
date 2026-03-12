import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type CourseItem = {
  id: number
  code: string
  label: string
  category: string
}

export type SchoolCourseWithJoins = {
  id: string
  school_id: string
  course_id: number
  course: CourseItem | null
  description: string | null
  course_date: string | null
  school_year: string | null
  name: string | null
  subject: string | null
  remarks: string | null
  created_at: string | null
  updated_at: string | null
}

/** Fetch all courses for a school with joined course reference */
export async function getSchoolCourses(schoolId: string): Promise<SchoolCourseWithJoins[]> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('school_courses')
    .select(`
      id, school_id, course_id, description, course_date,
      school_year, name, subject, remarks, created_at, updated_at,
      course:courses!school_courses_course_id_fkey(id, code, label, category)
    `)
    .eq('school_id', schoolId)
    .order('school_year', { ascending: false, nullsFirst: false })
    .order('course_id', { ascending: true })

  if (error) {
    console.error('Error fetching school courses:', error)
    return []
  }

  return (data ?? []) as unknown as SchoolCourseWithJoins[]
}

/** Fetch course dropdown values */
export async function getCourseReferenceData() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data } = await supabase
    .from('courses')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  return { courses: (data ?? []) as CourseItem[] }
}

/** Count courses for a school */
export async function getSchoolCourseCount(schoolId: string): Promise<number> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { count, error } = await supabase
    .from('school_courses')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)

  if (error) {
    console.error('Error fetching course count:', error)
    return 0
  }

  return count ?? 0
}
