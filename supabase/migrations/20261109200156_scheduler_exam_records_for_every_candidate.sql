-- Examinations booked in the Scheduler reach All exams and can be completed
-- (UAT DEV24-004). All exams lists exam records; only a booking made from an
-- existing exam request was linked to one, so exams booked straight in the
-- Scheduler, and every candidate of a group exam, had no record: they were
-- missing from All exams and "Showed up" had nothing to complete.
--
-- Now every exam candidate is linked to an exam record, created on first save
-- and kept in step with the booking: date, times, room, seat, school,
-- application, online link and status (pending, confirmed, completed when the
-- candidate showed up, cancelled with the booking or when taken off it).

alter table public.student_individual_exams
  add column if not exists scheduler_booking_id uuid references public.scheduler_bookings(id) on delete set null;
comment on column public.student_individual_exams.scheduler_booking_id is
  'The Scheduler booking this exam is sat in, once booked; kept when the booking is edited.';
create index if not exists student_individual_exams_scheduler_booking_idx
  on public.student_individual_exams (scheduler_booking_id) where scheduler_booking_id is not null;

alter table public.scheduler_booking_attendees
  add column if not exists exam_id uuid references public.student_individual_exams(id) on delete set null;
comment on column public.scheduler_booking_attendees.exam_id is
  'The exam record of this candidate; set for every candidate of an examination or group examination.';
create index if not exists scheduler_booking_attendees_exam_idx
  on public.scheduler_booking_attendees (exam_id) where exam_id is not null;

-- The exam record a candidate sits this booking under: the exam the booking was
-- made from when it is theirs, else the record this booking created for them,
-- else a new one.
create or replace function public.scheduler_candidate_exam(p_booking uuid, p_student uuid, p_booking_exam uuid)
returns uuid
language plpgsql
set search_path to ''
as $$
declare
  v_exam uuid;
  b      public.scheduler_bookings;
begin
  if p_booking_exam is not null then
    select e.id into v_exam from public.student_individual_exams e
     where e.id = p_booking_exam and e.student_id = p_student;
  end if;
  if v_exam is null then
    select e.id into v_exam from public.student_individual_exams e
     where e.scheduler_booking_id = p_booking and e.student_id = p_student
     order by e.created_at limit 1;
  end if;
  if v_exam is null then
    select * into b from public.scheduler_bookings where id = p_booking;
    insert into public.student_individual_exams (student_id, exam_type_id, status_id, title, subject, created_by, scheduler_booking_id)
    values (p_student, 2, 1, b.title, b.title, auth.uid(), p_booking)
    returning id into v_exam;
  end if;
  update public.student_individual_exams set scheduler_booking_id = p_booking
   where id = v_exam and scheduler_booking_id is null
     and not exists (select 1 from public.scheduler_bookings sb where sb.exam_id = v_exam and sb.id <> p_booking);
  return v_exam;
end $$;

-- Copies the booking's schedule and status onto each candidate's exam record.
create or replace function public.scheduler_sync_candidate_exams(p_booking uuid)
returns void
language plpgsql
set search_path to ''
as $$
begin
  update public.student_individual_exams e set
    confirmed_date       = (b.start_at at time zone 'Asia/Hong_Kong')::date,
    confirmed_start_time = (b.start_at at time zone 'Asia/Hong_Kong')::time,
    confirmed_end_time   = (b.end_at at time zone 'Asia/Hong_Kong')::time,
    room                 = r.display_name,
    room_id              = b.room_id,
    seat_no              = a.seat_no,
    school_id            = coalesce(b.school_id, e.school_id),
    application_id       = coalesce(a.application_id, b.application_id, e.application_id),
    delivery_mode_id     = case b.location_type when 'online' then 2 else 1 end,
    online_link          = case b.location_type when 'online' then b.online_link else e.online_link end,
    status_id            = case
                             when b.status = 'cancelled' then 4
                             when e.status_id = 3 then 3
                             when b.status = 'confirmed' then 2
                             else 1
                           end
    from public.scheduler_booking_attendees a
    join public.scheduler_bookings b on b.id = a.booking_id
    left join public.scheduler_rooms r on r.id = b.room_id
   where a.booking_id = p_booking and a.exam_id = e.id
     and b.booking_type in ('examination', 'group_examination');
end $$;

revoke execute on function public.scheduler_candidate_exam(uuid, uuid, uuid) from public, anon;
revoke execute on function public.scheduler_sync_candidate_exams(uuid) from public, anon;
grant execute on function public.scheduler_candidate_exam(uuid, uuid, uuid) to authenticated;
grant execute on function public.scheduler_sync_candidate_exams(uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.scheduler_save_booking(p_booking jsonb, p_attendees jsonb DEFAULT '[]'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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

  -- An examination booked straight in the Scheduler gets its exam record here, so it
  -- reaches All exams and can be completed (UAT DEV24-004). An edit keeps the record
  -- the booking already has.
  if v_type = 'examination' and v_exam is null and v_student is not null then
    if v_id is not null then
      select e.id into v_exam from public.student_individual_exams e
       where e.scheduler_booking_id = v_id and e.student_id = v_student limit 1;
    end if;
    if v_exam is null then
      insert into public.student_individual_exams (student_id, exam_type_id, status_id, title, subject, created_by)
      values (v_student, 2, 1, p_booking->>'title', p_booking->>'title', v_uid)
      returning id into v_exam;
    end if;
  end if;

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

  insert into public.scheduler_booking_attendees (booking_id, profile_id, student_id, role, seat_no, application_id, exam_id)
  select v_id,
         nullif(a->>'profile_id', '')::uuid,
         nullif(a->>'student_id', '')::uuid,
         coalesce(nullif(a->>'role', ''), 'attendee'),
         nullif(a->>'seat_no', '')::int,
         nullif(a->>'application_id', '')::uuid,
         case when coalesce(nullif(a->>'role', ''), 'attendee') = 'candidate' and nullif(a->>'student_id', '') is not null
              then public.scheduler_candidate_exam(v_id, (a->>'student_id')::uuid, v_exam) end
  from jsonb_array_elements(coalesce(p_attendees, '[]'::jsonb)) a;

  if v_student is not null and not exists (
      select 1 from public.scheduler_booking_attendees where booking_id = v_id and student_id = v_student) then
    insert into public.scheduler_booking_attendees (booking_id, student_id, role, application_id, exam_id)
    values (v_id, v_student, case when v_type in ('examination', 'group_examination') then 'candidate' else 'attendee' end,
            nullif(p_booking->>'application_id', '')::uuid,
            case when v_type in ('examination', 'group_examination') then public.scheduler_candidate_exam(v_id, v_student, v_exam) end);
  end if;

  -- A candidate taken off the booking no longer sits this exam.
  update public.student_individual_exams e set status_id = 4
   where e.scheduler_booking_id = v_id and e.status_id <> 3
     and not exists (select 1 from public.scheduler_booking_attendees a where a.booking_id = v_id and a.exam_id = e.id);

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
      status_id            = case when status_id = 3 then 3 when v_status = 'confirmed' then 2 else 1 end
    where id = v_exam;
  end if;

  perform public.scheduler_sync_candidate_exams(v_id);
  return v_id;
end $function$;

CREATE OR REPLACE FUNCTION public.scheduler_confirm_booking(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_exam uuid;
begin
  update public.scheduler_bookings
     set status = 'confirmed', confirmed_by = auth.uid(), confirmed_at = now()
   where id = p_id and status = 'pending'
  returning exam_id into v_exam;
  if not found then
    raise exception 'Booking not found or not pending' using errcode = 'P0002';
  end if;
  if v_exam is not null then
    update public.student_individual_exams set status_id = 2 where id = v_exam;
  end if;
  perform public.scheduler_sync_candidate_exams(p_id);
end $function$;

CREATE OR REPLACE FUNCTION public.scheduler_cancel_booking(p_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_exam uuid;
begin
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'A reason is required to cancel a booking' using errcode = 'SR004';
  end if;
  perform set_config('scheduler.reason', p_reason, true);
  update public.scheduler_bookings
     set status = 'cancelled'
   where id = p_id and status <> 'cancelled'
  returning exam_id into v_exam;
  if not found then
    raise exception 'Booking not found or already cancelled' using errcode = 'P0002';
  end if;
  if v_exam is not null then
    update public.student_individual_exams set status_id = 4 where id = v_exam;
  end if;
  perform public.scheduler_sync_candidate_exams(p_id);
end $function$;

CREATE OR REPLACE FUNCTION public.scheduler_record_attendance(p_id uuid, p_attendance text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_exam uuid;
begin
  if p_attendance not in ('show_up', 'no_show') then
    raise exception 'Attendance must be show_up or no_show' using errcode = '22P02';
  end if;
  update public.scheduler_bookings
     set attendance = p_attendance
   where id = p_id and status = 'confirmed'
  returning exam_id into v_exam;
  if not found then
    raise exception 'Only confirmed bookings can record attendance' using errcode = 'P0002';
  end if;
  if v_exam is not null and p_attendance = 'show_up' then
    update public.student_individual_exams set status_id = 3 where id = v_exam and status_id = 2;
  end if;
  -- Every candidate of the booking who sat it has a completed exam.
  if p_attendance = 'show_up' then
    update public.student_individual_exams e set status_id = 3
      from public.scheduler_booking_attendees a
     where a.booking_id = p_id and a.exam_id = e.id and e.status_id = 2;
  end if;
end $function$;
