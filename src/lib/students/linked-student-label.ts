import { formatDate } from '@/lib/applications/application-display'
import type { LinkedStudent } from '@/lib/supabase/queries/student-family'

/** "Edward CHAN 陳大文": the name as the student list shows it, with the Chinese name when there is one. */
export function linkedStudentName(student: Pick<LinkedStudent, 'first_name' | 'surname' | 'chinese_name'>): string {
  return [student.first_name, student.surname, student.chinese_name].filter(Boolean).join(' ')
}

/**
 * "S046020 · born 4 Mar 2010 · LA SALLE COLLEGE": what tells two students of the
 * same name apart in the picker and on the family cards.
 */
export function linkedStudentDetails(
  student: Pick<LinkedStudent, 'student_code' | 'date_of_birth' | 'present_school'>
): string {
  return [student.student_code, student.date_of_birth && `born ${formatDate(student.date_of_birth)}`, student.present_school]
    .filter(Boolean)
    .join(' · ')
}
