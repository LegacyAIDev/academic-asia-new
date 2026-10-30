/** Seeds the local test database (see e2e/setup-local-db.sh): three staff accounts at different levels and a student, two schools and an application. */
import { createClient } from '@supabase/supabase-js'
const admin = createClient(process.env.SB_URL, process.env.SB_SERVICE, { auth: { persistSession: false } })
const PASSWORD = process.env.E2E_PASSWORD
if (!PASSWORD) throw new Error('Set E2E_PASSWORD (e2e/setup-local-db.sh generates one)')
const users = [
  { email: 'manager@aa.test', first: 'Maggie', last: 'Manager', level: 3 },
  { email: 'staff@aa.test', first: 'Sam', last: 'Staff', level: 6 },
  { email: 'junior@aa.test', first: 'Jo', last: 'Junior', level: 7 },
]
for (const u of users) {
  const { data, error } = await admin.auth.admin.createUser({ email: u.email, password: PASSWORD, email_confirm: true })
  if (error && !/already/i.test(error.message)) throw error
  const id = data?.user?.id ?? (await admin.auth.admin.listUsers()).data.users.find(x => x.email === u.email).id
  if (!data?.user) await admin.auth.admin.updateUserById(id, { password: PASSWORD })
  const { error: pe } = await admin.from('profiles').update({ first_name: u.first, surname: u.last, admin_level: u.level, email_1: u.email }).eq('id', id)
  if (pe) throw pe
  console.log('user', u.email, 'level', u.level)
}
const school = async name => {
  const { data } = await admin.from('schools').select('id').eq('name', name).maybeSingle()
  return data?.id ?? (await admin.from('schools').insert({ name }).select('id').single()).data.id
}
const headington = await school('Headington School')
const brighton = await school('Brighton College')
let { data: student } = await admin.from('students').select('id').eq('surname', 'Ng').maybeSingle()
if (!student) student = (await admin.from('students').insert({ first_name: 'Lucas', surname: 'Ng', student_code: 'S000123' }).select('id').single()).data
const { data: app } = await admin.from('student_applications').select('id').eq('student_id', student.id).maybeSingle()
const application = app ?? (await admin.from('student_applications').insert({ student_id: student.id, school_id: headington, entry_year: 2027 }).select('id').single()).data
// An English Year 9 entrance exam at Headington, and an examination booking today that uses it (paper-versions suite).
let { data: exam } = await admin.from('school_entrance_exams').select('id').eq('school_id', headington).eq('subject', 'English').maybeSingle()
if (!exam) exam = (await admin.from('school_entrance_exams').insert({ school_id: headington, subject: 'English', year_level: 'Year 9', entry_year: '2027', duration_minutes: 60 }).select('id').single()).data
const hkToday = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10)
const { data: booked } = await admin.from('scheduler_bookings').select('id').eq('student_id', student.id).eq('local_date', hkToday).maybeSingle()
if (!booked) {
  const start = new Date(Math.ceil(Date.now() / 3600000) * 3600000 + 3600000)
  const { data: booking, error: be } = await admin.from('scheduler_bookings').insert({
    title: 'Lucas Ng · English entrance exam', booking_type: 'examination', status: 'confirmed',
    start_at: start.toISOString(), end_at: new Date(start.getTime() + 3600000).toISOString(), local_date: hkToday,
    location_type: 'online', student_id: student.id, school_id: headington, application_id: application.id,
    assessment_snapshot: { label: 'English', version: 1, notes: null, papers: [{ id: exam.id, subject: 'English', year_level: 'Year 9', entry_year: '2027', duration_minutes: 60 }] },
  }).select('id').single()
  if (be) throw be
  const { error: ae } = await admin.from('scheduler_booking_attendees').insert({ booking_id: booking.id, student_id: student.id, role: 'candidate' })
  if (ae) throw ae
}
console.log(JSON.stringify({ student: student.id, headington, brighton, application: application.id, exam: exam.id }))
