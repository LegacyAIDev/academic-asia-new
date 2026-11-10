import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeSupabaseStub, type Recorded } from '../../queries/__tests__/supabase-stub'

const state = vi.hoisted(() => ({ client: null as unknown }))

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({})) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => state.client) }))
vi.mock('@/lib/permissions/guard', () => ({ assertAccess: vi.fn(async () => null) }))
vi.mock('@/lib/supabase/actions/record-attachments', () => ({ purgeOwnerStorage: vi.fn() }))

import { createStudentEducation } from '../student-education'
import { createStudentExamResult } from '../student-exam-results'
import { createStudentVisa } from '../student-visas'
import { createStudentTravel } from '../student-travel'
import { createStudentResume } from '../student-resume'
import { createStudentEventApplication } from '../student-event-applications'
import { upsertStudentBriefIntro } from '../student-brief-intro'
import { createStudentContact } from '../students'
import { createSchoolContact } from '../school-contacts'
import { createSchoolBankDetail } from '../school-bank-details'
import { createSchoolVisit } from '../school-visits'

let queries: Recorded[]
beforeEach(() => {
  const stub = makeSupabaseStub(() => ({ data: null, error: null }))
  state.client = stub.supabase
  queries = stub.queries
})

/** Each form's create action, the untouched form's input, and the message staff see. */
const cases: [string, () => Promise<{ success: boolean; error?: string }>, string][] = [
  ['education', () => createStudentEducation({ student_id: 's1', course_id: null, tutor: '  ' }), 'Choose the course or enter the tutor'],
  ['exam result', () => createStudentExamResult({ student_id: 's1', exam_type_id: null, subject_id: null }), 'Choose the exam or the subject'],
  ['visa', () => createStudentVisa({ student_id: 's1', school_id: null, application: '' }), 'Choose the school this visa is for'],
  ['travel', () => createStudentTravel({ student_id: 's1', arrival_date: null, flight_number: '' }), 'Enter the arrival date or the flight number'],
  ['resume entry', () => createStudentResume({ student_id: 's1', resume_type_id: null }), 'Choose the type of entry'],
  ['event application', () => createStudentEventApplication({ student_id: 's1', event_id: null }), 'Choose the event'],
  ['family member', () => createStudentContact({ student_id: 's1' }), 'Choose the relationship'],
  ['school contact', () => createSchoolContact({ school_id: 'h1', first_name: '', surname: null }), "Enter the contact's name or email"],
  ['bank details', () => createSchoolBankDetail({ school_id: 'h1', bank_name: ' ' }), 'Enter the bank name or the account number'],
  ['school visit', () => createSchoolVisit({ school_id: 'h1', visit_date: null }), 'Enter the visit date'],
]

describe('an untouched form cannot create an empty record', () => {
  it.each(cases)('%s', async (_name, create, message) => {
    expect(await create()).toEqual({ success: false, error: message })
    expect(queries).toHaveLength(0)
  })

  it('a resume entry also needs what it is about', async () => {
    expect(await createStudentResume({ student_id: 's1', resume_type_id: 2, subject: ' ' }))
      .toEqual({ success: false, error: 'Add what this entry is about' })
  })

  it('a new brief intro needs some content, after checking none exists yet', async () => {
    expect(await upsertStudentBriefIntro({ student_id: 's1', hobbies: '', subjects: null }))
      .toEqual({ success: false, error: 'Fill in at least one part of the introduction' })
    expect(queries.map(q => q.table)).toEqual(['student_brief_intro'])
  })
})
