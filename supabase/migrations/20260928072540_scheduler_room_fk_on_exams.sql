-- ============================================================================
-- SCHEDULER: ROOM FOREIGN KEYS ON EXAMS
-- Repairs migration drift (room/seat_no exist in the live DB only), adds
-- room_id to exam records and event exam blocks, backfills them from the
-- legacy free-text room names and makes the scheduler RPCs write room_id and
-- the candidate's seat onto the exam record.
-- ============================================================================

alter table public.student_individual_exams add column if not exists room text;
alter table public.student_individual_exams add column if not exists seat_no int;
alter table public.student_individual_exams
  add column if not exists room_id uuid references public.scheduler_rooms(id) on delete set null;
alter table public.event_exam_blocks
  add column if not exists room_id uuid references public.scheduler_rooms(id) on delete set null;

create index if not exists student_individual_exams_room_id_idx on public.student_individual_exams(room_id);
create index if not exists event_exam_blocks_room_id_idx on public.event_exam_blocks(room_id);

-- The legacy data also used a generic "Other Room" for a handful of exams.
insert into public.scheduler_rooms (location_id, display_name, floor, capacity, sort_order)
select l.id, 'Other Room', '14/F', 4, 6 from public.scheduler_locations l where l.name = 'AA Centre'
on conflict (display_name) do nothing;

update public.student_individual_exams e
   set room_id = r.id
  from public.scheduler_rooms r
 where e.room_id is null and lower(trim(e.room)) = lower(r.display_name);

update public.event_exam_blocks b
   set room_id = r.id
  from public.scheduler_rooms r
 where b.room_id is null and lower(trim(b.venue_room)) = lower(r.display_name);

-- Exam branch of the calendar view now prefers the foreign key over the name match.
create or replace view public.scheduler_calendar_items with (security_invoker = true) as
select
  'booking'::text as source, b.id as source_id, b.id as booking_id, b.title, b.booking_type, b.status,
  b.start_at, b.end_at, b.local_date, b.location_type, b.room_id, r.display_name as room_name, r.floor, r.room_number,
  l.name as location_name, b.seats_required, b.is_exclusive, b.organiser_id, b.student_id, b.application_id, b.exam_id,
  b.school_id, b.online_link, b.notes, b.created_by
from public.scheduler_bookings b
left join public.scheduler_rooms r on r.id = b.room_id
left join public.scheduler_locations l on l.id = r.location_id
where b.status <> 'cancelled'
union all
select
  'exam', e.id, null, coalesce(e.title, t.label, 'Exam'), 'examination',
  case when e.status_id = 2 then 'confirmed' else 'pending' end,
  (e.confirmed_date + e.confirmed_start_time) at time zone 'Asia/Hong_Kong',
  (e.confirmed_date + e.confirmed_end_time)   at time zone 'Asia/Hong_Kong',
  e.confirmed_date,
  case when r.id is null then 'online' else 'room' end,
  r.id, r.display_name, r.floor, r.room_number, l.name, 1, false, null,
  e.student_id, e.application_id, e.id, e.school_id, e.online_link, e.remarks, null
from public.student_individual_exams e
left join public.individual_exam_types t on t.id = e.exam_type_id
left join public.scheduler_rooms r on r.id = coalesce(e.room_id, (select r2.id from public.scheduler_rooms r2 where lower(trim(e.room)) = lower(r2.display_name) limit 1))
left join public.scheduler_locations l on l.id = r.location_id
where e.status_id in (2, 3)
  and e.confirmed_date is not null and e.confirmed_start_time is not null and e.confirmed_end_time is not null
  and not exists (select 1 from public.scheduler_bookings b where b.exam_id = e.id and b.status <> 'cancelled')
union all
select
  'event_schedule', s.id, null,
  coalesce(ev.name, 'Event') || case when s.is_blocker then ' (blocked)' else '' end,
  'other', 'confirmed',
  (s.schedule_date + s.start_time) at time zone 'Asia/Hong_Kong',
  (s.schedule_date + s.end_time)   at time zone 'Asia/Hong_Kong',
  s.schedule_date,
  case when r.id is null then 'online' else 'room' end,
  r.id, r.display_name, r.floor, r.room_number, l.name, 1, false, null,
  s.student_id, null, null, ev.school_id, ev.online_link, s.remarks, null
from public.event_schedules s
join public.events ev on ev.id = s.event_id
left join public.event_representatives rep on rep.id = s.representative_id
left join public.scheduler_rooms r on lower(trim(rep.venue_room)) = lower(r.display_name)
left join public.scheduler_locations l on l.id = r.location_id
where s.schedule_date is not null and s.start_time is not null and s.end_time is not null;

-- The save RPC mirrors room_id and the candidate's seat onto the exam record.
create or replace function public.scheduler_save_booking(p_booking jsonb, p_attendees jsonb default '[]'::jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_id        uuid := nullif(p_booking->>'id', '')::uuid;
  v_uid       uuid := auth.uid();
  v_type      text := p_booking->>'booking_type';
  v_start     timestamptz := (p_booking->>'start_at')::timestamptz;
  v_end       timestamptz := (p_booking->>'end_at')::timestamptz;
  v_room      uuid := nullif(p_booking->>'room_id', '')::uuid;
  v_student   uuid := nullif(p_booking->>'student_id', '')::uuid;
  v_exam      uuid := nullif(p_booking->>'exam_id', '')::uuid;
  v_status    text;
  v_room_name text;
  v_seat      int;
begin
  perform set_config('scheduler.reason', coalesce(p_booking->>'reason', ''), true);

  if v_id is null then
    v_status := coalesce(nullif(p_booking->>'status', ''),
                         case when v_type in ('examination', 'group_examination') then 'pending' else 'confirmed' end);
    insert into public.scheduler_bookings (
      title, booking_type, status, start_at, end_at, local_date, location_type, room_id, seats_required, is_exclusive,
      organiser_id, student_id, application_id, exam_id, assessment_set_id, assessment_snapshot, school_id,
      online_link, notes, instructions, created_by)
    values (
      p_booking->>'title', v_type, v_status, v_start, v_end, (v_start at time zone 'Asia/Hong_Kong')::date,
      coalesce(nullif(p_booking->>'location_type', ''), case when v_room is null then 'online' else 'room' end),
      v_room, coalesce((p_booking->>'seats_required')::int, 1), coalesce((p_booking->>'is_exclusive')::boolean, false),
      coalesce(nullif(p_booking->>'organiser_id', '')::uuid, v_uid), v_student,
      nullif(p_booking->>'application_id', '')::uuid, v_exam, nullif(p_booking->>'assessment_set_id', '')::uuid,
      p_booking->'assessment_snapshot', nullif(p_booking->>'school_id', '')::uuid,
      nullif(p_booking->>'online_link', ''), p_booking->>'notes', p_booking->>'instructions', v_uid)
    returning id, status into v_id, v_status;
  else
    update public.scheduler_bookings set
      title = p_booking->>'title', booking_type = v_type, start_at = v_start, end_at = v_end,
      local_date = (v_start at time zone 'Asia/Hong_Kong')::date,
      location_type = coalesce(nullif(p_booking->>'location_type', ''), case when v_room is null then 'online' else 'room' end),
      room_id = v_room, seats_required = coalesce((p_booking->>'seats_required')::int, 1),
      is_exclusive = coalesce((p_booking->>'is_exclusive')::boolean, false),
      organiser_id = coalesce(nullif(p_booking->>'organiser_id', '')::uuid, organiser_id),
      student_id = v_student, application_id = nullif(p_booking->>'application_id', '')::uuid, exam_id = v_exam,
      assessment_set_id = nullif(p_booking->>'assessment_set_id', '')::uuid, assessment_snapshot = p_booking->'assessment_snapshot',
      school_id = nullif(p_booking->>'school_id', '')::uuid, online_link = nullif(p_booking->>'online_link', ''),
      notes = p_booking->>'notes', instructions = p_booking->>'instructions'
    where id = v_id and status <> 'cancelled'
    returning status into v_status;
    if not found then
      raise exception 'Booking not found or already cancelled' using errcode = 'P0002';
    end if;
    delete from public.scheduler_booking_attendees where booking_id = v_id;
  end if;

  insert into public.scheduler_booking_attendees (booking_id, profile_id, student_id, role, seat_no, application_id)
  select v_id,
         nullif(a->>'profile_id', '')::uuid,
         nullif(a->>'student_id', '')::uuid,
         coalesce(nullif(a->>'role', ''), 'attendee'),
         nullif(a->>'seat_no', '')::int,
         nullif(a->>'application_id', '')::uuid
  from jsonb_array_elements(coalesce(p_attendees, '[]'::jsonb)) a;

  if v_student is not null and not exists (
      select 1 from public.scheduler_booking_attendees where booking_id = v_id and student_id = v_student) then
    insert into public.scheduler_booking_attendees (booking_id, student_id, role, application_id)
    values (v_id, v_student, case when v_type in ('examination', 'group_examination') then 'candidate' else 'attendee' end,
            nullif(p_booking->>'application_id', '')::uuid);
  end if;

  if v_exam is not null then
    select display_name into v_room_name from public.scheduler_rooms where id = v_room;
    select seat_no into v_seat from public.scheduler_booking_attendees
     where booking_id = v_id and student_id = v_student limit 1;
    update public.student_individual_exams set
      confirmed_date       = (v_start at time zone 'Asia/Hong_Kong')::date,
      confirmed_start_time = (v_start at time zone 'Asia/Hong_Kong')::time,
      confirmed_end_time   = (v_end at time zone 'Asia/Hong_Kong')::time,
      room                 = v_room_name,
      room_id              = v_room,
      seat_no              = v_seat,
      status_id            = case when v_status = 'confirmed' then 2 else 1 end
    where id = v_exam;
  end if;

  return v_id;
end $$;
