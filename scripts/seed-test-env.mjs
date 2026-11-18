/**
 * Seeds the test environment's Supabase project with sample logins and
 * fictional students, so the client can try the app without touching live data.
 * The schools, fees, rooms and locations are copied from live separately (no
 * personal data); nothing here is real.
 *
 * Usage: TEST_SB_URL=... TEST_SB_SECRET=... TEST_PASSWORD=... node scripts/seed-test-env.mjs
 * Refuses to run against the live project. Safe to run more than once.
 */
import { createClient } from '@supabase/supabase-js'

const LIVE_REF = 'sotfycrfhwanjbcemrai'
const { TEST_SB_URL: url, TEST_SB_SECRET: secret, TEST_PASSWORD: password } = process.env
if (!url || !secret || !password) throw new Error('Set TEST_SB_URL, TEST_SB_SECRET and TEST_PASSWORD')
if (url.includes(LIVE_REF)) throw new Error('This is the live project; the seed only runs on the test one')
const db = createClient(url, secret, { auth: { persistSession: false } })

const must = async query => {
  const { data, error } = await query
  if (error) throw error
  return data
}
const idOf = async (table, column, value) => (await must(db.from(table).select('id').eq(column, value).single())).id

// One login per access level, all with the same password.
const users = [
  { email: 'admin@aa-test.app', first: 'Test', last: 'Admin', level: 0 },
  { email: 'manager@aa-test.app', first: 'Test', last: 'Manager', level: 3 },
  { email: 'staff@aa-test.app', first: 'Test', last: 'Staff', level: 6 },
  { email: 'junior@aa-test.app', first: 'Test', last: 'Junior', level: 7 },
]
const { data: { users: existing } } = await db.auth.admin.listUsers()
const staffIds = {}
for (const u of users) {
  let id = existing.find(x => x.email === u.email)?.id
  if (id) await must(db.auth.admin.updateUserById(id, { password }))
  else id = (await must(db.auth.admin.createUser({ email: u.email, password, email_confirm: true }))).user.id
  await must(db.from('profiles').update({ first_name: u.first, surname: u.last, admin_level: u.level, email_1: u.email }).eq('id', id))
  staffIds[u.level] = id
  console.log('login', u.email)
}

const status = {}
for (const s of await must(db.from('student_statuses').select('id, code'))) status[s.code] = s.id
const school = {}
for (const s of await must(db.from('schools').select('id, name').in('name', ['Headington School', 'Brighton College', 'Sevenoaks School', 'Eton College', 'Harrow School', 'Oundle School', 'Millfield School']))) school[s.name] = s.id
const appStatus = {}
for (const s of await must(db.from('application_statuses').select('id, code'))) appStatus[s.code] = s.id
const mother = await idOf('contact_relationships', 'code', 'mother')
const father = await idOf('contact_relationships', 'code', 'father')

// Fictional families. Codes start with T so they never look like live ones.
const students = [
  { code: 'T000001', first: 'Chloe', surname: 'Wong', gender: 'F', dob: '2013-03-14', status: 'enquiry', entry: 2027, apps: [] },
  { code: 'T000002', first: 'Ethan', surname: 'Chan', gender: 'M', dob: '2012-07-02', status: 'enquiry', entry: 2027, apps: [] },
  { code: 'T000003', first: 'Sophie', surname: 'Lee', gender: 'F', dob: '2012-11-20', status: 'new', entry: 2027, apps: [['Headington School', 'awaiting_interview']] },
  { code: 'T000004', first: 'Ryan', surname: 'Cheung', gender: 'M', dob: '2011-05-09', status: 'new', entry: 2026, apps: [['Brighton College', 'awaiting_aa_test']] },
  { code: 'T000005', first: 'Hannah', surname: 'Lau', gender: 'F', dob: '2011-09-30', status: 'pending', entry: 2026, apps: [['Sevenoaks School', 'awaiting_offer'], ['Oundle School', 'awaiting_interview']] },
  { code: 'T000006', first: 'Marcus', surname: 'Ho', gender: 'M', dob: '2010-01-17', status: 'active', entry: 2026, apps: [['Eton College', 'offered'], ['Harrow School', 'waiting_list']] },
  { code: 'T000007', first: 'Isabella', surname: 'Ng', gender: 'F', dob: '2010-06-25', status: 'active', entry: 2026, apps: [['Millfield School', 'deposited']] },
  { code: 'T000008', first: 'Oscar', surname: 'Ng', gender: 'M', dob: '2012-02-11', status: 'new', entry: 2028, apps: [['Millfield School', 'awaiting_testing']] },
  { code: 'T000009', first: 'Grace', surname: 'Tam', gender: 'F', dob: '2009-12-03', status: 'closed', entry: 2025, apps: [['Headington School', 'completed']] },
  { code: 'T000010', first: 'Leo', surname: 'Yip', gender: 'M', dob: '2011-04-22', status: 'dead', entry: 2026, apps: [['Brighton College', 'withdrawn']] },
]

const made = {}
for (const s of students) {
  const row = {
    student_code: s.code, first_name: s.first, surname: s.surname, gender: s.gender, date_of_birth: s.dob,
    status_id: status[s.status], entry_year: s.entry, email: `${s.first.toLowerCase()}.${s.surname.toLowerCase()}@example.com`,
    mobile: '+852 5' + s.code.slice(-3) + ' 0000', assigned_to: staffIds[3],
  }
  const found = await must(db.from('students').select('id').eq('student_code', s.code).maybeSingle())
  const id = found?.id ?? (await must(db.from('students').insert(row).select('id').single())).id
  made[s.code] = id
  if (found) continue
  await must(db.from('student_contacts').insert([
    { student_id: id, relationship_id: mother, first_name: 'Mrs', surname: s.surname, email_1: `mother.${s.surname.toLowerCase()}@example.com`, mobile: '+852 6' + s.code.slice(-3) + ' 1111', priority: 1 },
    { student_id: id, relationship_id: father, first_name: 'Mr', surname: s.surname, email_1: `father.${s.surname.toLowerCase()}@example.com`, mobile: '+852 6' + s.code.slice(-3) + ' 2222', priority: 2 },
  ]))
  for (const [name, code] of s.apps) {
    await must(db.from('student_applications').insert({ student_id: id, school_id: school[name], status_id: appStatus[code], entry_year: s.entry }))
  }
  console.log('student', s.code, s.first, s.surname)
}

// A consultation and an entrance exam in the coming week, so the calendar and exam desk are not empty.
const hkDate = days => new Date(Date.now() + 8 * 3600000 + days * 86400000).toISOString().slice(0, 10)
const at = (days, hkHour) => new Date(`${hkDate(days)}T${String(hkHour - 8).padStart(2, '0')}:00:00Z`).toISOString()
const room = (await must(db.from('scheduler_rooms').select('id').order('display_name').limit(1).single())).id
const bookings = [
  { title: 'Consultation · Chloe Wong', booking_type: 'consultation', days: 1, hour: 11, student: 'T000001' },
  { title: 'Entrance exam · Hannah Lau', booking_type: 'examination', days: 2, hour: 10, student: 'T000005', school: 'Sevenoaks School' },
]
for (const b of bookings) {
  if (await must(db.from('scheduler_bookings').select('id').eq('title', b.title).maybeSingle())) continue
  const booking = await must(db.from('scheduler_bookings').insert({
    title: b.title, booking_type: b.booking_type, status: 'confirmed', start_at: at(b.days, b.hour), end_at: at(b.days, b.hour + 1),
    local_date: hkDate(b.days), location_type: 'room', room_id: room, seats_required: 1, student_id: made[b.student],
    school_id: b.school ? school[b.school] : null, organiser_id: staffIds[3],
  }).select('id').single())
  await must(db.from('scheduler_booking_attendees').insert({ booking_id: booking.id, student_id: made[b.student], role: 'candidate', seat_no: 1 }))
  console.log('booking', b.title)
}
console.log('done')
